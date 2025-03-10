import { Test, TestingModule } from '@nestjs/testing';

import { UtilsService } from '../services';

import { CountryService } from './country.service';

describe('CountryService', () => {
  let countryService: CountryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CountryService, UtilsService],
    }).compile();

    countryService = module.get<CountryService>(CountryService);
  });

  describe('searchCountriesOrRegions', () => {
    it('should return 2 countries data when search term matches a region name', () => {
      const result = countryService.searchCountriesOrRegions('Wales');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ iso: 'GB' }),
          expect.objectContaining({ iso: 'AU' }),
        ]),
      );
    });

    it('should return 1 country data when search term matches a region name', () => {
      const result = countryService.searchCountriesOrRegions('Scotland');

      expect(result).toEqual([expect.objectContaining({ iso: 'GB' })]);
    });

    it('should return 1 country data when search term matches a region name - extra spaces case', () => {
      const result = countryService.searchCountriesOrRegions('Scotland ');

      expect(result).toEqual([expect.objectContaining({ iso: 'GB' })]);
    });

    it('should return empty array data when search term is empty, null or undefined', () => {
      const resultEmpty = countryService.searchCountriesOrRegions('');
      const resultNull = countryService.searchCountriesOrRegions(null);
      const resultUndefined =
        countryService.searchCountriesOrRegions(undefined);

      expect(resultEmpty).toEqual([]);
      expect(resultNull).toEqual([]);
      expect(resultUndefined).toEqual([]);
    });

    it('should return 2 countries data when search term matches a region name written in french', () => {
      const result = countryService.searchCountriesOrRegions('Écosse');

      expect(result).toEqual([
        expect.objectContaining({ iso: 'CA' }),
        expect.objectContaining({ iso: 'GB' }),
      ]);
    });

    it('should return 2 countries when remvoveAccents option is true', () => {
      const result = countryService.searchCountriesOrRegions('Ecosse');
      const resultRemoveAccents = countryService.searchCountriesOrRegions(
        'Ecosse',
        { removeAccents: true },
      );

      expect(result).toEqual([]);
      expect(resultRemoveAccents).toEqual([
        expect.objectContaining({ iso: 'CA' }),
        expect.objectContaining({ iso: 'GB' }),
      ]);
    });

    it('should return 1 country data when search term matches a country name written in french', () => {
      const result = countryService.searchCountriesOrRegions('Japon');

      expect(result).toEqual([expect.objectContaining({ iso3: 'JPN' })]);
    });

    it('should return 1 country data when search term matches a region name', () => {
      const result = countryService.searchCountriesOrRegions('Kentucky');

      expect(result).toEqual([expect.objectContaining({ iso3: 'USA' })]);
    });

    it('should return only french translations', () => {
      const result = countryService.searchCountriesOrRegions('Irlande', {
        keepKeys: ['iso', 'iso3', 'names.fr', 'regions.names.fr'],
      });

      expect(result).toEqual([
        {
          iso: 'GB',
          iso3: 'GBR',
          names: { fr: 'Royaume-Uni' },
          regions: expect.arrayContaining([
            expect.objectContaining({
              names: expect.objectContaining({ fr: 'Irlande du Nord' }),
            }),
          ]),
        },
        {
          iso: 'IE',
          iso3: 'IRL',
          names: { fr: 'Irlande' },
          regions: expect.arrayContaining([]),
        },
        {
          iso: 'PG',
          iso3: 'PNG',
          names: { fr: 'Papouasie-Nouvelle-Guinée' },
          regions: expect.arrayContaining([
            expect.objectContaining({
              names: expect.objectContaining({ fr: 'Nouvelle-Irlande' }),
            }),
          ]),
        },
      ]);
    });

    it('should return french and english translations', () => {
      const result = countryService.searchCountriesOrRegions('Thaïlande', {
        keepKeys: [
          'iso',
          'iso3',
          'names.en',
          'names.fr',
          'regions.names.en',
          'regions.names.fr',
        ],
      });

      expect(result).toEqual([
        {
          iso: 'TH',
          iso3: 'THA',
          names: { en: 'Thailand', fr: 'Thaïlande' },
          regions: expect.arrayContaining([
            expect.objectContaining({
              names: expect.objectContaining({ en: 'Bangkok', fr: 'Bangkok' }),
            }),
          ]),
        },
      ]);
    });

    describe('searchInText option enabled', () => {
      it('should not found corresponding', () => {
        const result = countryService.searchCountriesOrRegions(
          'Knockando Whisky Ecosse Speyside Single Malt 12 ans 70cl',
          { searchInText: true },
        );

        expect(result).toEqual([]);
      });

      it('should not found corresponding', () => {
        const result = countryService.searchCountriesOrRegions(
          'The Dubliner Irish Whisky Bourbon Cask Aged 40° 70cl',
          { searchInText: true },
        );

        expect(result).toEqual([]);
      });

      it('should find 2 countries', () => {
        const result = countryService.searchCountriesOrRegions(
          'Togouchi Premium Whisky Japonais 40° 70cl',
          { searchInText: true },
        );

        expect(result).toEqual([
          expect.objectContaining({ iso3: 'JPN' }),
          expect.objectContaining({ iso3: 'TGO' }),
        ]);
      });

      it('should find 1 country when remvoveAccents option is true', () => {
        const result = countryService.searchCountriesOrRegions(
          'Knockando Whisky Ecosse Speyside Single Malt 12 ans 70cl',
          { searchInText: true, removeAccents: true },
        );

        expect(result).toEqual([expect.objectContaining({ iso3: 'GBR' })]);
      });
    });

    describe('exact option enabled', () => {
      it('should return only french translations and 1 country', () => {
        const result = countryService.searchCountriesOrRegions('Irlande', {
          keepKeys: ['iso', 'iso3', 'names.fr', 'regions.names.fr'],
          exact: true,
        });

        expect(result).toEqual([
          {
            iso: 'IE',
            iso3: 'IRL',
            names: { fr: 'Irlande' },
            regions: expect.arrayContaining([]),
          },
        ]);
        expect(result.length).toBe(1);
      });
    });
  });
});
