import { Injectable, OnModuleInit } from '@nestjs/common';

import { AlcoholService } from './alcohol.service';
import {
  Country,
  CountryService,
  FilterOptions,
} from '../country/country.service';
import { CountryInfo } from './entities/country-info.entity';
import { AlcoholDocument } from './entities/alcohol.entity';

@Injectable()
export class AlcoholMaintenanceService implements OnModuleInit {
  constructor(
    private readonly alcoholService: AlcoholService,
    private readonly countryService: CountryService,
  ) {}

  async onModuleInit() {
    const args = process.argv.slice(2);
    if (args.includes('--maintenance')) {
      await this.fixMissingFrenchNames();
    }
  }

  private async fixMissingFrenchNames() {
    const results =
      await this.alcoholService.findAllWhereCountryNameMissing('fr');
    console.log(
      `[Maintenance] ${results.length} items missing country.names.fr`,
    );

    for (const alcohol of results) {
      console.log(`\nasin: ${alcohol.asin}`);
      console.log(
        `Missing 'fr' for: ${alcohol.country?.names?.en || '[Unnamed]'}`,
      );

      if (alcohol.country?.names?.en) {
        const filterOptions: FilterOptions = {
          exact: true,
          keepKeys: [
            'iso',
            'iso3',
            'names.fr',
            'names.en',
            'regions.iso',
            'regions.names.fr',
            'regions.names.en',
          ],
          keepOnlyMatchingRegions: true,
        };
        const foundCountries =
          await this.countryService.searchCountriesOrRegions(
            alcohol.country?.names?.en?.trim(),
            filterOptions,
          );
        console.log('foundCountries.length:', foundCountries.length);

        if (foundCountries.length === 1) {
          const country = foundCountries[0];
          console.log('country:', country, 'regions:', country.regions);

          if (
            country.iso &&
            country.iso3 &&
            country.names?.en &&
            (country.names?.fr === 'La Réunion' ||
              country.names?.fr === 'Martinique' ||
              country.names?.fr === 'Guadeloupe')
          ) {
            delete country.regions;
            await this.saveAlcoholCountry(alcohol, country);
          }

          if (
            country.iso &&
            country.iso3 &&
            country.names?.en &&
            country.names?.fr &&
            country.regions &&
            (country.regions[0]?.names?.en === country.names?.en ||
              country.regions[0]?.names?.fr === country.names?.fr)
          ) {
            delete country.regions;
            await this.saveAlcoholCountry(alcohol, country);
          }

          if (
            country.iso &&
            country.iso3 &&
            country.names?.en &&
            country.names?.fr &&
            !country.regions
          ) {
            await this.saveAlcoholCountry(alcohol, country);
          }
        }
      } else {
        console.log(`${alcohol.country?.names?.en} undefined!`);
      }
    }
  }

  private async saveAlcoholCountry(
    alcohol: AlcoholDocument,
    country: Country,
  ): Promise<void> {
    alcohol.country = this.transformCountryToCountryInfo(country);
    console.log('alcohol.save()');
    await alcohol.save();

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private transformCountryToCountryInfo(country: Country): CountryInfo {
    if (!country) return null;

    const countryInfo = new CountryInfo();

    countryInfo.names = {
      en: country.names.en ?? '',
      fr: country.names.fr ?? '',
    };
    countryInfo.iso = country.iso;
    countryInfo.iso3 = country.iso3;

    if (country.regions) {
      countryInfo.regions = country.regions.map((region) => ({
        iso: region.iso,
        names: {
          en: region.names?.en ?? '',
          fr: region.names?.fr ?? '',
        },
      }));
    }

    return countryInfo;
  }
}
