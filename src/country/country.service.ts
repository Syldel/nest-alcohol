import { Injectable } from '@nestjs/common';

import { UtilsService } from '../services';

import allCountriesData from 'iso3166-2-db/data/iso3166-2.json';

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
}

@Injectable()
export class CountryService {
  constructor(private readonly utilsService: UtilsService) {}

  get allCountries(): { [key: string]: Country } {
    return allCountriesData;
  }

  public searchCountriesOrRegions(
    searchTerm: string,
    options?: FilterOptions,
  ): Country[] {
    if (!searchTerm) {
      return [];
    }

    const dataSet: { [key: string]: Country } = allCountriesData;

    let matchesNames: boolean;
    let matchesRegions: boolean;
    let extraKeepKeys: string[];
    const filtered: Country[] = Object.entries(dataSet)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([code, country]) => {
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

        return matchesNames || matchesRegions;
      })
      .map(([code, country]) => {
        return { code, ...country };
      })
      .map((country) => {
        if (options?.keepKeys?.length > 0) {
          return this.utilsService.pick(country, options.keepKeys);
        }
        return country;
      });

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
      return lowerSearchTerm.includes(countryName) && name.length > 0;
    }

    if (options?.exact) {
      return countryName === lowerSearchTerm;
    } else {
      return countryName.includes(lowerSearchTerm);
    }
  }
}
