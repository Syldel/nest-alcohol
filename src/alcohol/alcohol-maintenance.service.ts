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
      await this.fixMissingCountryIsoCodes();
    }
  }

  private async fixMissingFrenchNames() {
    // 1. Country names missing 'fr'
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
        if (foundCountries.length > 1) {
          console.log('foundCountries.length:', foundCountries.length);
        }

        if (foundCountries.length === 1) {
          const country = foundCountries[0];
          console.dir(country, { depth: 4, colors: true });

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

    // 2. Region names missing 'fr'
    const regionResults =
      await this.alcoholService.findAllWhereRegionNameMissing('fr');
    console.log(
      `[Maintenance] ${regionResults.length} items with region(s) missing names.fr`,
    );

    for (const alcohol of regionResults) {
      console.log(`\nasin: ${alcohol.asin}`);
      console.log(
        `Missing 'fr' for: ${alcohol.country?.regions[0].names?.en || '[Unnamed]'}`,
      );

      for (const region of alcohol.country?.regions ?? []) {
        console.log('region:', region);
        if (alcohol.country.names?.en === region.names?.en) {
          delete alcohol.country.regions;
          alcohol.markModified('country.regions');

          console.log('alcohol.country:', alcohol.country);
          console.log('alcohol.save()');
          await alcohol.save();

          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
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

  /**
   * Fixes missing or empty iso and iso3 codes for countries in alcohol documents.
   */
  private async fixMissingCountryIsoCodes(): Promise<void> {
    // Fix missing iso3
    const missingIso3Results =
      await this.alcoholService.findAllWhereCountryFieldMissing('iso3');
    console.log(
      `[Maintenance] ${missingIso3Results.length} items missing country.iso3`,
    );

    for (const alcohol of missingIso3Results) {
      console.log(`\nasin: ${alcohol.asin}`);
      console.log(
        `Missing 'iso3' for: ${alcohol.country?.names?.en || '[Unnamed]'}`,
      );

      if (
        alcohol.country?.names?.en === 'Champagne' ||
        alcohol.country?.names?.fr === 'Champagne'
      ) {
        const country = {
          names: {
            fr: 'France',
            en: 'France',
          },
          iso: 'FR',
          iso3: 'FRA',
          regions: [
            {
              names: {
                fr: 'Champagne',
                en: 'Champagne',
              },
              iso: 'GE',
            },
          ],
        };

        alcohol.country = country;
        console.log('alcohol.save()');
        await alcohol.save();

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

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
        if (foundCountries.length > 1) {
          console.log('foundCountries.length:', foundCountries.length);
        }

        if (foundCountries.length === 1) {
          const country = foundCountries[0];
          console.dir(country, { depth: 4, colors: true });

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
            console.dir(country, { depth: 4, colors: true });
          }

          await this.saveAlcoholCountry(alcohol, country);
        }
      } else {
        console.log(`${alcohol.country?.names?.en} undefined!`);
      }
    }
  }
}
