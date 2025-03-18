import { Injectable } from '@nestjs/common';

import { JsonProcessingService } from '../services/json-processing.service';
import { UtilsService } from '../services/utils.service';

export type Region = {
  name: string;
  names: {
    [key: string]: string;
  };
  iso: string;
  fips: string;
  admin: string;
  reference: {
    geonames: number;
    openstreetmap: number;
    openstreetmap_level: number;
    wikipedia: string;
    wof: string | number;
  };
};

export type Country = {
  iso: string;
  iso3: string;
  numeric: number;
  fips: string;
  reference: {
    geonames: number;
    openstreetmap: number;
    wikipedia: string;
  };
  //name: string;
  names: {
    [key: string]: string;
  };
  regions: Region[];
};

export interface FilterOptions {
  removeAccents?: boolean;
  searchInText?: boolean;
  keepKeys?: string[];
  exact?: boolean;
  keepOnlyMatchingRegions?: boolean;
}

@Injectable()
export class CountryService {
  constructor(
    private readonly utilsService: UtilsService,
    private readonly jsonProcessingService: JsonProcessingService,
  ) {}

  public async searchCountriesOrRegions(
    searchTerm: string,
    options?: FilterOptions,
  ): Promise<Country[]> {
    if (!searchTerm) {
      return [];
    }

    let matchesNames: boolean;
    let matchesRegions: boolean;
    let extraKeepKeys: string[];

    const filePath = 'node_modules/iso3166-2-db/data/iso3166-2.json';

    let filtered: Country[] = [];
    const processLine = (country: Country) => {
      if (options?.keepKeys?.length > 0) {
        // We need to add 'names' and 'regions.names' to be able to do a search on it!
        extraKeepKeys = this.utilsService.deepCloneJSON(options.keepKeys);
        extraKeepKeys.push('names', 'regions.names');
        extraKeepKeys = this.utilsService.removeDuplicates(
          extraKeepKeys,
          (item) => item,
        );

        country = this.utilsService.pick(country, extraKeepKeys);
      }

      matchesNames = Object.values(country.names).some((countryName) => {
        return this.processCountryName(searchTerm, countryName, options);
      });

      matchesRegions =
        country.regions &&
        country.regions.some((region) => {
          return Object.values(region.names).some((regionName) => {
            return this.processCountryName(searchTerm, regionName, options);
          });
        });

      if (matchesNames || matchesRegions) {
        filtered.push(country);
      }
    };

    await this.jsonProcessingService.processJsonFile(filePath, processLine);

    filtered = filtered.map((country) => {
      if (options?.keepKeys?.length > 0) {
        return this.utilsService.pick(country, options.keepKeys);
      }
      return country;
    });

    if (options?.keepOnlyMatchingRegions) {
      filtered = filtered
        .map((country) => ({
          ...country,
          ...{
            regions: this.filterRegions(searchTerm, country.regions, options),
          },
        }))
        .map((country) => {
          if (country.regions.length === 0) {
            delete country.regions;
          }
          return country;
        });
    }

    return filtered;
  }

  private processCountryName(
    searchTerm: string,
    name: string,
    options?: FilterOptions,
  ): boolean {
    let lowerSearchTerm = searchTerm.toLowerCase().trim();

    if (options?.removeAccents) {
      lowerSearchTerm = this.utilsService.removeAccents(lowerSearchTerm);
    }

    let countryName: string;
    if (options?.removeAccents) {
      countryName = this.utilsService.removeAccents(name.toLowerCase());
    } else {
      countryName = name.toLowerCase();
    }

    if (options?.searchInText) {
      if (options?.exact) {
        return lowerSearchTerm
          .replace(/[^a-zA-Z0-9À-ÿ]/g, ' ')
          .split(' ')
          .filter((searchWord) => searchWord.length > 1)
          .some((searchWord) => {
            return searchWord === countryName;
          });
      } else {
        return lowerSearchTerm.includes(countryName) && name.length > 0;
      }
    }

    if (options?.exact) {
      return countryName === lowerSearchTerm;
    } else {
      return countryName.includes(lowerSearchTerm);
    }
  }

  public filterRegions(
    searchTerm: string,
    regions: Region[],
    options?: FilterOptions,
  ) {
    return regions.filter((region) => {
      return Object.values(region.names).some((regionName) => {
        return this.processCountryName(searchTerm, regionName, options);
      });
    });
  }
}
