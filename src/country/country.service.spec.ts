import { Test, TestingModule } from '@nestjs/testing';

import { CountryService } from './country.service';
import { CountryModule } from './country.module';
import { SharedModule } from '../services/shared.module';

describe('CountryService', () => {
  let countryService: CountryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CountryModule, SharedModule],
    }).compile();

    countryService = module.get<CountryService>(CountryService);
  });

  describe('searchCountriesOrRegions', () => {
    it('should return 2 countries data when search term matches a region name', async () => {
      const result = await countryService.searchCountriesOrRegions('Wales');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ iso: 'GB' }),
          expect.objectContaining({ iso: 'AU' }),
        ]),
      );
    });

    it('should return 1 country data when search term matches a region name', async () => {
      const result = await countryService.searchCountriesOrRegions('Scotland');

      expect(result).toEqual([expect.objectContaining({ iso: 'GB' })]);
    });

    it('should return 1 country data when search term matches a region name - extra spaces case', async () => {
      const result = await countryService.searchCountriesOrRegions('Scotland ');

      expect(result).toEqual([expect.objectContaining({ iso: 'GB' })]);
    });

    it('should return empty array data when search term is empty, null or undefined', async () => {
      const resultEmpty = await countryService.searchCountriesOrRegions('');
      const resultNull = await countryService.searchCountriesOrRegions(null);
      const resultUndefined =
        await countryService.searchCountriesOrRegions(undefined);

      expect(resultEmpty).toEqual([]);
      expect(resultNull).toEqual([]);
      expect(resultUndefined).toEqual([]);
    });

    it('should return 2 countries data when search term matches a region name written in french', async () => {
      const result = await countryService.searchCountriesOrRegions('Écosse');

      expect(result).toEqual([
        expect.objectContaining({ iso: 'CA' }),
        expect.objectContaining({ iso: 'GB' }),
      ]);
    });

    it('should return 2 countries when remvoveAccents option is true', async () => {
      const result = await countryService.searchCountriesOrRegions('Ecosse');
      const resultRemoveAccents = await countryService.searchCountriesOrRegions(
        'Ecosse',
        { removeAccents: true },
      );

      expect(result).toEqual([]);
      expect(resultRemoveAccents).toEqual([
        expect.objectContaining({ iso: 'CA' }),
        expect.objectContaining({ iso: 'GB' }),
      ]);
    });

    it('should return 1 country data when search term matches a country name written in french', async () => {
      const result = await countryService.searchCountriesOrRegions('Japon');

      expect(result).toEqual([expect.objectContaining({ iso3: 'JPN' })]);
    });

    it('should return 1 country data when search term matches a region name', async () => {
      const result = await countryService.searchCountriesOrRegions('Kentucky');

      expect(result).toEqual([expect.objectContaining({ iso3: 'USA' })]);
    });

    it('should return only french translations', async () => {
      const result = await countryService.searchCountriesOrRegions('Irlande', {
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

    it('should return french and english translations', async () => {
      const result = await countryService.searchCountriesOrRegions(
        'Thaïlande',
        {
          keepKeys: [
            'iso',
            'iso3',
            'names.en',
            'names.fr',
            'regions.names.en',
            'regions.names.fr',
          ],
        },
      );

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
      it('should not found corresponding', async () => {
        const result = await countryService.searchCountriesOrRegions(
          'Knockando Whisky Ecosse Speyside Single Malt 12 ans 70cl',
          { searchInText: true },
        );

        expect(result).toEqual([]);
      });

      it('should not found corresponding', async () => {
        const result = await countryService.searchCountriesOrRegions(
          'The Dubliner Irish Whisky Bourbon Cask Aged 40° 70cl',
          { searchInText: true },
        );

        expect(result).toEqual([]);
      });

      it('should find 2 countries', async () => {
        const result = await countryService.searchCountriesOrRegions(
          'Togouchi Premium Whisky Japonais 40° 70cl',
          { searchInText: true },
        );

        expect(result).toEqual([
          expect.objectContaining({ iso3: 'JPN' }),
          expect.objectContaining({ iso3: 'TGO' }),
        ]);
      });

      it('should find 1 country when remvoveAccents option is true', async () => {
        const result = await countryService.searchCountriesOrRegions(
          'Knockando Whisky Ecosse Speyside Single Malt 12 ans 70cl',
          { searchInText: true, removeAccents: true },
        );

        expect(result).toEqual([expect.objectContaining({ iso3: 'GBR' })]);
      });
    });

    describe('exact option enabled', () => {
      it('should return only french translations and 1 country', async () => {
        const result = await countryService.searchCountriesOrRegions(
          'Irlande',
          {
            keepKeys: ['iso', 'iso3', 'names.fr', 'regions.names.fr'],
            exact: true,
          },
        );

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

    describe('keepOnlyMatchingRegions option enabled', () => {
      it('should return only french translations of 1 country and 1 region', async () => {
        const result = await countryService.searchCountriesOrRegions(
          'Kentucky',
          {
            keepKeys: ['iso', 'iso3', 'names.fr', 'regions.names.fr'],
            exact: true,
            keepOnlyMatchingRegions: true,
          },
        );

        expect(result).toEqual([
          {
            iso: 'US',
            iso3: 'USA',
            names: { fr: 'États-Unis' },
            regions: [{ names: { fr: 'Kentucky' } }],
          },
        ]);
        expect(result.length).toBe(1);
      });

      it('should return country with region in searchInText mode', async () => {
        const result = await countryService.searchCountriesOrRegions(
          `Sans Gluten Bouteille United States 1,08 Kilogrammes DIAGEO Kentucky Bourbon (adding also Tennessee) (french sentence: "Où çà, l'été rêvé à Évreux ?")`,
          {
            keepKeys: ['iso', 'iso3', 'names.fr', 'regions.names.fr'],
            exact: true,
            searchInText: true,
            keepOnlyMatchingRegions: true,
          },
        );

        expect(result).toEqual([
          {
            iso: 'US',
            iso3: 'USA',
            names: { fr: 'États-Unis' },
            regions: [
              { names: { fr: 'Tennessee' } },
              { names: { fr: 'Kentucky' } },
            ],
          },
        ]);
        expect(result.length).toBe(1);
      });

      it('should return country with region in searchInText mode with accents in the sentence', async () => {
        const result = await countryService.searchCountriesOrRegions(
          `TAMNAVULIN - Double Cask - Whisky Single Malt - Notes d'Amandes & de Miel - A déguster sec - 40 % Alcool - Origine : Écosse/Speyside - 70 cl`,
          {
            keepKeys: ['iso', 'iso3', 'names.fr', 'regions.names.fr'],
            exact: true,
            searchInText: true,
            keepOnlyMatchingRegions: true,
          },
        );

        expect(result).toEqual([
          {
            iso: 'GB',
            iso3: 'GBR',
            names: { fr: 'Royaume-Uni' },
            regions: [{ names: { fr: 'Écosse' } }],
          },
        ]);
        expect(result.length).toBe(1);
      });
    });
  });

  describe('filterRegions', () => {
    it('should return regions that match the search term', () => {
      const mockRegions: any[] = [
        {
          names: { en: 'California', es: 'California' },
          iso: 'US-CA',
        },
        {
          names: { en: 'Texas', es: 'Tejas' },
          iso: 'US-TX',
        },
      ];

      const result = countryService.filterRegions('calif', mockRegions);

      expect(result).toHaveLength(1);
      expect(result[0].names.en).toBe('California');
    });
  });
});
