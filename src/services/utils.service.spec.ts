import { Test, TestingModule } from '@nestjs/testing';

import { UtilsService } from './utils.service';

describe('UtilsService', () => {
  let app: TestingModule;
  let utilsService: UtilsService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      providers: [UtilsService],
    }).compile();

    utilsService = app.get<UtilsService>(UtilsService);
  });

  describe('waitSeconds', () => {
    it('should wait for specified milliseconds before resolving', async () => {
      const startTime = Date.now();
      await utilsService.waitSeconds(1000);
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(800);
      expect(endTime - startTime).toBeLessThanOrEqual(1200);
    });
  });

  describe('getLastElement', () => {
    it('should return last element when string has multiple elements', () => {
      const input = 'first/second/third';
      const delimiter = '/';
      const result = utilsService.getLastElement(input, delimiter);
      expect(result).toBe('third');
    });

    it('should return last element when string has one element', () => {
      const input = 'first';
      const delimiter = '/';
      const result = utilsService.getLastElement(input, delimiter);
      expect(result).toBe('first');
    });

    it('should return undefined when input is undefined', () => {
      const input = undefined;
      const delimiter = '/';
      const result = utilsService.getLastElement(input, delimiter);
      expect(result).toBeUndefined();
    });

    it('should return null when input is null', () => {
      const input = null;
      const delimiter = '/';
      const result = utilsService.getLastElement(input, delimiter);
      expect(result).toBeNull();
    });
  });

  describe('getAllButLast', () => {
    it('should return all parts except last when input has multiple parts', () => {
      const input = 'part1,part2,part3';
      const delimiter = ',';
      const result = utilsService.getAllButLast(input, delimiter);
      expect(result).toBe('part1,part2');
    });

    it('should return one element when string has one element', () => {
      const input = 'first';
      const delimiter = '/';
      const result = utilsService.getAllButLast(input, delimiter);
      expect(result).toBe('first');
    });

    it('should return undefined when input is undefined', () => {
      const input = undefined;
      const delimiter = '/';
      const result = utilsService.getAllButLast(input, delimiter);
      expect(result).toBeUndefined();
    });

    it('should return null when input is null', () => {
      const input = null;
      const delimiter = '/';
      const result = utilsService.getAllButLast(input, delimiter);
      expect(result).toBeNull();
    });
  });

  describe('roundPercent', () => {
    it('should return rounded percentage when given valid positive numbers', () => {
      const result1 = utilsService.roundPercent(25, 50);
      const result2 = utilsService.roundPercent(25, 100);
      const result3 = utilsService.roundPercent(33.333, 100);
      const result4 = utilsService.roundPercent(10, 3);
      expect(result1).toBe('50%');
      expect(result2).toBe('25%');
      expect(result3).toBe('33%');
      expect(result4).toBe('333%');
    });
  });

  describe('getFileExtension', () => {
    it('should return extension when filename has single extension', () => {
      const fileName = 'test.txt';
      const result = utilsService.getFileExtension(fileName);
      expect(result).toBe('txt');
    });

    it('should return null when input is null', () => {
      const result = utilsService.getFileExtension(null);
      expect(result).toBeNull();
    });

    it('should return undefined when input is undefined', () => {
      const result = utilsService.getFileExtension(undefined);
      expect(result).toBeUndefined();
    });

    it('should return empty string when input is empty string', () => {
      const result = utilsService.getFileExtension('');
      expect(result).toBe('');
    });

    it('should return correct extension when filename has uppercase and lowercase extensions', () => {
      const fileName = 'example.FILE';
      const result = utilsService.getFileExtension(fileName);
      expect(result).toBe('FILE');
    });

    it('should return correct extension when filename contains special characters', () => {
      const fileName = 'file@name#with$special%chars!.ext';
      const result = utilsService.getFileExtension(fileName);
      expect(result).toBe('ext');
    });

    it('should return last segment after dot when filename has multiple dots', () => {
      const fileName = 'archive.tar.gz';
      const result = utilsService.getFileExtension(fileName);
      expect(result).toBe('gz');
    });
  });

  describe('extractPriceAndCurrency', () => {
    const extractPrice = (price: string) =>
      utilsService.extractPriceAndCurrency(price);

    it('should extract the numeric value and currency correctly', () => {
      expect(extractPrice('33.22€')).toEqual({ price: 33.22, currency: '€' });
      expect(extractPrice('11.11 USD')).toEqual({
        price: 11.11,
        currency: 'USD',
      });
      expect(extractPrice('11,22 EUR')).toEqual({
        price: 11.22,
        currency: 'EUR',
      });
      expect(extractPrice('55CHF')).toEqual({ price: 55, currency: 'CHF' });
      expect(extractPrice('12.34 XYZ')).toEqual({
        price: 12.34,
        currency: 'XYZ',
      });
      expect(extractPrice('99 999,99 $CAN')).toEqual({
        price: 99999.99,
        currency: '$CAN',
      });
    });

    it('should handle spaces around the currency and number', () => {
      expect(extractPrice('  33.22€  ')).toEqual({
        price: 33.22,
        currency: '€',
      });
      expect(extractPrice('11.11 USD ')).toEqual({
        price: 11.11,
        currency: 'USD',
      });
      expect(extractPrice(' 11,22 EUR')).toEqual({
        price: 11.22,
        currency: 'EUR',
      });
    });

    it('should return null for value and currency if no number is found', () => {
      expect(extractPrice('abc')).toBeNull();
      expect(extractPrice('   ')).toBeNull();
    });

    it('should return the currency even if the numeric value is invalid', () => {
      expect(extractPrice('invalid€')).toEqual({ price: null, currency: '€' });
      expect(extractPrice('12,34,56 USD')).toEqual({
        price: null,
        currency: 'USD',
      });
      expect(extractPrice('12.34.56 USD')).toEqual({
        price: null,
        currency: 'USD',
      });
    });

    it('should handle prices with thousands separators', () => {
      expect(extractPrice('1 234,56€')).toEqual({
        price: 1234.56,
        currency: '€',
      });
      expect(extractPrice('1.234,56 USD')).toEqual({
        price: 1234.56,
        currency: 'USD',
      });
    });

    it('should handle prices with points and commas', () => {
      expect(extractPrice('1.234,56€')).toEqual({
        price: 1234.56,
        currency: '€',
      });
      expect(extractPrice('1,234.56 USD')).toEqual({
        price: 1234.56,
        currency: 'USD',
      });
    });

    it('should return price when there is only digits', () => {
      expect(extractPrice('123')).toEqual({ currency: null, price: 123 });
    });

    it('should return null for invalid inputs', () => {
      expect(extractPrice('invalid')).toBeNull();
      expect(extractPrice('')).toBeNull();
      expect(extractPrice('12.34€ 56.78€')).toBeNull();
    });
  });

  describe('cleanHtml', () => {
    it('should remove script tags and their content when HTML contains script tags', () => {
      const html = '<div>Hello World</div><script>alert("test");</script>';
      const expected = '<div>Hello World</div>';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe(expected);
    });

    it('should return empty string when input is empty', () => {
      const html = '';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe('');
    });

    it('should replace multiple consecutive whitespaces with a single space when HTML contains extra spaces', () => {
      const html = '<div>Hello     World</div>';
      const expected = '<div>Hello World</div>';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe(expected);
    });

    it('should remove HTML comments when HTML contains comments', () => {
      const html = '<!-- This is a comment --><div>Hello World</div>';
      const expected = '<div>Hello World</div>';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe(expected);
    });

    it('should remove script tags, comments, and extra spaces when HTML contains multiple script tags and comments', () => {
      const html =
        '<script>alert("test1");</script><div>Hello World<!-- comment --><script>alert("test2");</script></div>';
      const expected = '<div>Hello World</div>';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe(expected);
    });

    it('should remove script tags, comments, and extra spaces when HTML contains multiple script tags and comments', () => {
      const html = `<!-- show up to 2 reviews by default --> 

        <h3><span>Description du produit</span></h3>      

        <p>Description</p>


        <script>
          console.log('Ceci est un script');
        </script>

        <p>Texte après le script.</p>`;
      const expected =
        '<h3><span>Description du produit</span></h3> <p>Description</p> <p>Texte après le script.</p>';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe(expected);
    });

    it('should remove script tags, comments, and extra spaces when HTML contains multiple script tags and comments', () => {
      const html = `<!-- show up to 2 reviews by default --> 
               <h3> <span>Description du produit</span> </h3>        <p><span>Description du produit<br>Bulleit 10 ans, issu de réserves sélectionnées par Tom Bulleit, arrière petit-fils du fondateur de la distillerie, est une nouvelle expression du Bulleit Bourbon.</p></span><script>
                  P.when('A').execute(function(A) {
                      A.on('a:expander:toggle_description:toggle:collapse', function(data) {
                        window.scroll(0, data.expander.$expander[0].offsetTop-100);
                      });
                    });
                </script>
                <div class="a-expander-content">Voir plus</div>`;
      const expected =
        '<h3> <span>Description du produit</span> </h3> <p><span>Description du produit<br>Bulleit 10 ans, issu de réserves sélectionnées par Tom Bulleit, arrière petit-fils du fondateur de la distillerie, est une nouvelle expression du Bulleit Bourbon.</p></span> <div>Voir plus</div>';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe(expected);
    });

    it('should remove data-*, class', () => {
      const htmlInput = `<div data-csa-c-func-deps="aui-da-a-expander-toggle" data-csa-c-type="widget" data-csa-interaction-events="click" aria-expanded="false" role="button" href="javascript:void(0)" data-action="a-expander-toggle" class="a-expander-header a-declarative a-expander-extend-header" data-csa-c-id="16tcau-kqx4td-64fhow-kx7t4f">
  <i class="a-icon a-icon-extender-expand"></i><span class="a-expander-prompt">Voir plus</span></div>`;
      const expected =
        '<div aria-expanded="false" role="button" href="javascript:void(0)"> <i></i><span>Voir plus</span></div>';
      const result = utilsService.cleanHtml(htmlInput);
      expect(result).toBe(expected);
    });

    it('should remove links', () => {
      const htmlInput = `<h3> <span>Description du produit</span> </h3><a data-csa-c-func-deps="aui-da-a-expander-toggle" data-csa-c-type="widget" data-csa-interaction-events="click" aria-expanded="false" role="button" href="javascript:void(0)" data-action="a-expander-toggle" class="a-expander-header a-declarative a-expander-extend-header" data-csa-c-id="16tcau-kqx4td-64fhow-kx7t4f">
  <i class="a-icon a-icon-extender-expand"></i><span class="a-expander-prompt">Voir plus</span></a><p>Après le lien</p>`;
      const expected =
        '<h3> <span>Description du produit</span> </h3><p>Après le lien</p>';
      const result = utilsService.cleanHtml(htmlInput);
      expect(result).toBe(expected);
    });

    it('should remove data-*, class and style', () => {
      const htmlInput = `<h3> <span>Description du produit</span> </h3><div data-expanded="false" class="a-expander-content a-expander-extend-content" style="display:none">    <h3> <span>Avertissement De Sûreté</span> </h3>        <p> <span>Interdiction de vente de boissons alcooliques aux mineurs de moins de 18 ans</span>  </p>        </div> <p>Après display none</p>`;
      const expected =
        '<h3> <span>Description du produit</span> </h3><div> <h3> <span>Avertissement De Sûreté</span> </h3> <p> <span>Interdiction de vente de boissons alcooliques aux mineurs de moins de 18 ans</span> </p> </div> <p>Après display none</p>';
      const result = utilsService.cleanHtml(htmlInput);
      expect(result).toBe(expected);
    });
  });

  describe('extractNumbers', () => {
    const extractNumbers = (input: string) =>
      utilsService.extractNumbers(input);

    it('should extract simple integers', () => {
      const input = 'There are 42 apples and 15 oranges. And 1 ananas.';
      const result = extractNumbers(input);
      expect(result).toEqual([42, 15, 1]);
    });

    it('should extract decimal numbers with dots', () => {
      const input = 'The price is 12.34 $ and the discount is 5.5 %.';
      const result = extractNumbers(input);
      expect(result).toEqual([12.34, 5.5]);
    });

    it('should extract decimal numbers with commas', () => {
      const input = 'The amount is 12,34 € and the discount is 5,5 %.';
      const result = extractNumbers(input);
      expect(result).toEqual([12.34, 5.5]);
    });

    it('should extract numbers with spaces as thousand separators', () => {
      const input = 'The amount is 1 456,65 € or 1 134 456,56 $.';
      const result = extractNumbers(input);
      expect(result).toEqual([1456.65, 1134456.56]);
    });

    it('should handle numbers with mixed dots and spaces', () => {
      const input = 'Here is 1 234.56 or 12 345 678.9.';
      const result = extractNumbers(input);
      expect(result).toEqual([1234.56, 12345678.9]);
    });

    it('should return an empty array if no numbers are found', () => {
      const input = 'No numbers here!';
      const result = extractNumbers(input);
      expect(result).toEqual([]);
    });

    it('should extract negative numbers', () => {
      const input = 'Temperature: -12,5°C and altitude: -1234 m.';
      const result = extractNumbers(input);
      expect(result).toEqual([-12.5, -1234]);
    });

    it('should handle numbers with inconsistent separators', () => {
      const input = 'Values: 1.234,56 and 12,34 and 1234.';
      const result = extractNumbers(input);
      expect(result).toEqual([1234.56, 12.34, 1234]);
    });
  });

  describe('cleanNumberFormat', () => {
    const cleanNumberFormat = (input: string) =>
      utilsService.cleanNumberFormat(input);

    it('should remove extra dots from numbers', () => {
      expect(cleanNumberFormat('1.123.15')).toBe('1123.15');
      expect(cleanNumberFormat('1.132.456.25')).toBe('1132456.25');
    });

    it('should handle numbers with commas as decimal separators', () => {
      expect(cleanNumberFormat('12,345.67')).toBe('12345.67');
      expect(cleanNumberFormat('1.234,56')).toBe('1234.56');
    });

    it('should handle numbers without any dots or commas', () => {
      expect(cleanNumberFormat('1234')).toBe('1234');
    });

    it('should handle numbers with only a decimal part', () => {
      expect(cleanNumberFormat('1234.56')).toBe('1234.56');
    });

    it('should handle empty strings', () => {
      expect(cleanNumberFormat('')).toBe('');
    });
  });

  describe('removeDuplicates', () => {
    describe('by value', () => {
      it('should return array with unique elements when using keySelector function', () => {
        const input = [
          { legend: '1', value: 'John' },
          { legend: '2', value: 'John' },
          { legend: '3', value: 'Jane' },
        ];
        const result = utilsService.removeDuplicates(
          input,
          (item) => item.value,
        );
        expect(result).toHaveLength(2);
        expect(result).toEqual([
          { legend: '1', value: 'John' },
          { legend: '3', value: 'Jane' },
        ]);
      });

      it('should return single element when all elements are duplicates', () => {
        const input = [
          { legend: '1', value: 'John' },
          { legend: '2', value: 'John' },
          { legend: '3', value: 'John' },
        ];
        const result = utilsService.removeDuplicates(
          input,
          (item) => item.value,
        );
        expect(result).toHaveLength(1);
        expect(result).toEqual([{ legend: '1', value: 'John' }]);
      });

      it('should preserve the original order of elements after removing duplicates', () => {
        const input = [
          { legend: '1', value: 'Alice' },
          { legend: '2', value: 'Bob' },
          { legend: '3', value: 'Alice' },
          { legend: '4', value: 'Charlie' },
          { legend: '5', value: 'Alfred' },
        ];
        const result = utilsService.removeDuplicates(
          input,
          (item) => item.value,
        );
        expect(result).toEqual([
          { legend: '1', value: 'Alice' },
          { legend: '2', value: 'Bob' },
          { legend: '4', value: 'Charlie' },
          { legend: '5', value: 'Alfred' },
        ]);
      });
    });

    describe('by legend', () => {
      it('should return array with unique elements when using keySelector function', () => {
        const input = [
          { legend: '1', value: 'John' },
          { legend: '1', value: 'Joe' },
          { legend: '1', value: 'Jasmin' },
          { legend: '3', value: 'Jane' },
        ];
        const result = utilsService.removeDuplicates(
          input,
          (item) => item.legend,
        );
        expect(result).toHaveLength(2);
        expect(result).toEqual([
          { legend: '1', value: 'John' },
          { legend: '3', value: 'Jane' },
        ]);
      });
    });

    describe('by legend and value', () => {
      it('should return array with unique elements when using keySelector function', () => {
        const input = [
          { legend: '1', value: 'John' },
          { legend: '1', value: 'Joe' },
          { legend: '1', value: 'Jasmin' },
          { legend: '3', value: 'Jane' },
        ];
        const result = utilsService.removeDuplicates(
          input,
          (item) => `${item.legend}-${item.value}`,
        );
        expect(result).toHaveLength(4);
        expect(result).toEqual([
          { legend: '1', value: 'John' },
          { legend: '1', value: 'Joe' },
          { legend: '1', value: 'Jasmin' },
          { legend: '3', value: 'Jane' },
        ]);
      });

      it('should return array with unique elements when using keySelector function', () => {
        const input = [
          { legend: '1', value: 'John' },
          { legend: '1', value: 'Joe' },
          { legend: '1', value: 'John' },
          { legend: '3', value: 'Jane' },
          { legend: '3', value: 'Jane' },
        ];
        const result = utilsService.removeDuplicates(
          input,
          (item) => `${item.legend}-${item.value}`,
        );
        expect(result).toHaveLength(3);
        expect(result).toEqual([
          { legend: '1', value: 'John' },
          { legend: '1', value: 'Joe' },
          { legend: '3', value: 'Jane' },
        ]);
      });
    });

    it('should return an empty array when input is empty', () => {
      const input: any[] = [];
      const result = utilsService.removeDuplicates(input, (item) => item);
      expect(result).toEqual([]);
    });
  });

  describe('mergeDuplicates', () => {
    it('should merge objects with the same key', () => {
      const array = [
        { id: '1', value: 1 },
        { id: '2', value: 2 },
        { id: '1', value: 3 },
      ];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.id,
        (acc, current) => ({ ...acc, value: acc.value + current.value }),
      );

      expect(mergedArray).toEqual([
        { id: '1', value: 4 },
        { id: '2', value: 2 },
      ]);
    });

    it('should handle an empty array', () => {
      const array: { id: string; value: number }[] = [];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.id,
        (acc, current) => ({ ...acc, value: acc.value + current.value }),
      );

      expect(mergedArray).toEqual([]);
    });

    it('should handle an array with no duplicates', () => {
      const array = [
        { id: '1', value: 1 },
        { id: '2', value: 2 },
        { id: '3', value: 3 },
      ];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.id,
        (acc, current) => ({ ...acc, value: acc.value + current.value }),
      );

      expect(mergedArray).toEqual(array);
    });

    it('should handle different merge functions', () => {
      const array = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
        { id: '1', name: 'Doe' },
      ];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.id,
        (acc, current) => ({ ...acc, name: `${acc.name} ${current.name}` }),
      );

      expect(mergedArray).toEqual([
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane' },
      ]);
    });

    it('should handle different key selectors', () => {
      const array = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
        { firstName: 'John', lastName: 'Smith' },
      ];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.firstName,
        (acc, current) => ({
          ...acc,
          lastName: `${acc.lastName} ${current.lastName}`,
        }),
      );

      expect(mergedArray).toEqual([
        { firstName: 'John', lastName: 'Doe Smith' },
        { firstName: 'Jane', lastName: 'Smith' },
      ]);
    });

    it('should merge objects with nested properties', () => {
      const array = [
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
        },
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [{ names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' }],
        },
      ];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.iso,
        (acc, current) => ({ ...acc, ...current }),
      );

      expect(mergedArray).toEqual([
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [{ names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' }],
        },
      ]);
    });

    it('should merge objects with different regions', () => {
      const array = [
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [
            {
              name: 'Tennessee',
              names: {
                en: 'Tennessee',
                fr: 'Tennessee',
              },
              iso: 'TN',
              reference: {
                geonames: 4662168,
                openstreetmap: 161838,
              },
            },
          ],
        },
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [{ names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' }],
        },
      ];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.iso,
        (acc, current) => {
          const mergedRegions = current.regions
            ? acc.regions
              ? [...acc.regions, ...current.regions]
              : current.regions
            : acc.regions;

          return { ...acc, ...current, regions: mergedRegions };
        },
      );

      expect(mergedArray).toEqual([
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [
            {
              name: 'Tennessee',
              names: {
                en: 'Tennessee',
                fr: 'Tennessee',
              },
              iso: 'TN',
              reference: {
                geonames: 4662168,
                openstreetmap: 161838,
              },
            },
            { names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' },
          ],
        },
      ]);
    });

    it('should merge objects with partially duplicated regions', () => {
      const array = [
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [
            {
              name: 'Tennessee',
              names: {
                en: 'Tennessee',
                fr: 'Tennessee',
              },
              iso: 'TN',
              reference: {
                geonames: 4662168,
                openstreetmap: 161838,
              },
            },
          ],
        },
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [
            { names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' },
            {
              names: {
                en: 'Tennessee',
                fr: 'Tennessee',
              },
              iso: 'TN',
            },
          ],
        },
      ];

      const mergedArray = utilsService.mergeDuplicates(
        array,
        (item) => item.iso,
        (acc, current) => {
          const mergedRegions = utilsService.mergeDuplicates(
            [...(acc.regions ?? []), ...(current.regions ?? [])],
            (item) => item.iso,
          );

          return { ...acc, ...current, regions: mergedRegions };
        },
      );

      expect(mergedArray).toEqual([
        {
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [
            {
              name: 'Tennessee',
              names: {
                en: 'Tennessee',
                fr: 'Tennessee',
              },
              iso: 'TN',
              reference: {
                geonames: 4662168,
                openstreetmap: 161838,
              },
            },
            { names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' },
          ],
        },
      ]);
    });
  });

  describe('removeAccents', () => {
    it('should remove accents from common French words', () => {
      expect(utilsService.removeAccents("Éléphant à l'école")).toBe(
        "Elephant a l'ecole",
      );
      expect(utilsService.removeAccents('Crème brûlée')).toBe('Creme brulee');
    });

    it('should handle uppercase and lowercase letters', () => {
      expect(utilsService.removeAccents('ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝ')).toBe(
        'AAAAAACEEEEIIIIOOOOOUUUUY',
      );
      expect(utilsService.removeAccents('àáâãäåçèéêëìíîïòóôõöùúûüýÿ')).toBe(
        'aaaaaaceeeeiiiiooooouuuuyy',
      );
    });

    it('should return the same string if there are no accents', () => {
      expect(utilsService.removeAccents('Hello World')).toBe('Hello World');
      expect(utilsService.removeAccents('12345!@#$%^&*()-_[]£§')).toBe(
        '12345!@#$%^&*()-_[]£§',
      );
    });

    it('should handle empty strings', () => {
      expect(utilsService.removeAccents('')).toBe('');
    });

    it('should handle strings with only accents', () => {
      expect(utilsService.removeAccents('éèêë')).toBe('eeee');
      expect(utilsService.removeAccents('çôùï')).toBe('coui');
    });
  });

  describe('pick', () => {
    it('should extract simple properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = ['a', 'c'];
      const result = utilsService.pick(obj, keys);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should extract nested properties', () => {
      const obj = {
        nested: {
          x: 10,
          y: {
            z: 20,
          },
        },
        other: 30,
      };
      const keys = ['nested.x', 'nested.y.z', 'other'];
      const result = utilsService.pick(obj, keys);
      expect(result).toEqual({
        nested: { x: 10, y: { z: 20 } },
        other: 30,
      });
    });

    it('should handle missing properties', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'c', 'd.e'];
      const result = utilsService.pick(obj, keys);
      expect(result).toEqual({ a: 1 });
    });

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 };
      const keys: string[] = [];
      const result = utilsService.pick(obj, keys);
      expect(result).toEqual({});
    });

    it('should handle objects in array in nested keys', () => {
      const obj = {
        items: [
          { name: 'item1', regions: { en: 'Sweden', fr: 'Suède' } },
          { name: 'item2', regions: { en: 'Japan', fr: 'Japon' } },
        ],
      };
      const keys = ['items.name', 'items.regions.fr'];
      const result = utilsService.pick(obj, keys);

      expect(result).toEqual({
        items: [
          { name: 'item1', regions: { fr: 'Suède' } },
          { name: 'item2', regions: { fr: 'Japon' } },
        ],
      });
    });

    it('should handle objects in array in nested keys - several subkeys', () => {
      const obj = {
        names: {
          en: 'Countries',
          fr: 'Pays',
          ar: '???',
          de: '????',
          es: '?????',
        },
        items: [
          {
            name: 'item1',
            regions: {
              en: 'Sweden',
              fr: 'Suède',
              ar: 'السويد',
              de: 'Schweden',
              es: 'Suecia',
            },
          },
          {
            name: 'item2',
            regions: {
              en: 'Japan',
              fr: 'Japon',
              ar: 'اليابان',
              de: 'Japan',
              es: 'Japón',
            },
          },
        ],
      };
      const keys = [
        'names.fr',
        'names.en',
        'items.name',
        'items.regions.fr',
        'items.regions.en',
      ];
      const result = utilsService.pick(obj, keys);

      expect(result).toEqual({
        names: { en: 'Countries', fr: 'Pays' },
        items: [
          { name: 'item1', regions: { en: 'Sweden', fr: 'Suède' } },
          { name: 'item2', regions: { en: 'Japan', fr: 'Japon' } },
        ],
      });
    });

    it('should handle a nested property that does not exist', () => {
      const obj = {
        nested: {
          x: 10,
        },
      };
      const keys = ['nested.y.z'];
      const result = utilsService.pick(obj, keys);
      expect(result).toEqual({ nested: {} });
    });
  });

  describe('deepCloneJSON', () => {
    it('should clone a simple object', () => {
      const obj = { a: 1, b: 'test' };
      const clone = utilsService.deepCloneJSON(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    it('should clone a nested object', () => {
      const obj = { a: 1, b: { c: 2, d: 'test' } };
      const clone = utilsService.deepCloneJSON(obj);
      expect(clone).toEqual(obj);
      expect(clone.b).not.toBe(obj.b);
    });

    it('should clone an array', () => {
      const obj = [1, 'test', { a: 1 }];
      const clone = utilsService.deepCloneJSON(obj);
      expect(clone).toEqual(obj);
      expect(clone[2]).not.toBe(obj[2]);
    });

    it('should clone a complex object', () => {
      const obj = {
        a: 1,
        b: 'test',
        c: [1, 2, { d: 3 }],
        e: { f: 'test', g: [4, 5] },
      };
      const clone = utilsService.deepCloneJSON(obj);
      expect(clone).toEqual(obj);
      expect(clone.c).not.toBe(obj.c);
      expect(clone.e).not.toBe(obj.e);
    });

    it('should handle null and undefined', () => {
      expect(utilsService.deepCloneJSON(null)).toBeNull();
      expect(utilsService.deepCloneJSON(undefined)).toBeUndefined();
    });

    it('should throw an error for circular references', () => {
      const obj: any = { a: 1 };
      obj.b = obj;
      expect(() => utilsService.deepCloneJSON(obj)).toThrow();
    });

    it('should not clone functions', () => {
      const obj = { a: 1, b: () => {} };
      const clone = utilsService.deepCloneJSON(obj);
      expect(clone.b).toBeUndefined();
    });

    it('should not clone dates', () => {
      const obj = { a: 1, b: new Date() };
      const clone = utilsService.deepCloneJSON(obj);
      expect(clone.b).toBeDefined();
      expect(clone.b instanceof Date).toBeFalsy();
    });
  });

  describe('isObject', () => {
    it('should return true for a plain object', () => {
      expect(utilsService.isObject({})).toBe(true);
      expect(utilsService.isObject({ a: 1 })).toBe(true);
    });

    it('should return false for null', () => {
      expect(utilsService.isObject(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(utilsService.isObject(undefined)).toBe(false);
    });

    it('should return false for an array', () => {
      expect(utilsService.isObject([])).toBe(false);
      expect(utilsService.isObject([1, 2, 3])).toBe(false);
    });

    it('should return false for a string', () => {
      expect(utilsService.isObject('test')).toBe(false);
    });

    it('should return false for a number', () => {
      expect(utilsService.isObject(123)).toBe(false);
    });

    it('should return false for a boolean', () => {
      expect(utilsService.isObject(true)).toBe(false);
      expect(utilsService.isObject(false)).toBe(false);
    });

    it('should return false for a function', () => {
      expect(utilsService.isObject(() => {})).toBe(false);
    });
  });

  describe('deepMerge', () => {
    it('should deepMerge two simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = utilsService.deepMerge({}, target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should deepMerge nested objects', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 } };
      const result = utilsService.deepMerge({}, target, source);
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 } });
    });

    it('should deepMerge arrays', () => {
      const target = { a: [1, 2] };
      const source = { a: [3, 4] };
      const result = utilsService.deepMerge({}, target, source);
      expect(result).toEqual({ a: [3, 4] });
    });

    it('should deepMerge objects with mixed types', () => {
      const target = { a: 1, b: { c: 2 }, d: [1, 2] };
      const source = { b: { d: 3 }, d: [3, 4], e: 'test' };
      const result = utilsService.deepMerge({}, target, source);
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, d: [3, 4], e: 'test' });
    });

    it('should handle multiple sources', () => {
      const target = { a: 1 };
      const source1 = { b: 2 };
      const source2 = { c: 3 };
      const result = utilsService.deepMerge({}, target, source1, source2);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should handle empty sources', () => {
      const target = { a: 1 };
      const result = utilsService.deepMerge({}, target);
      expect(result).toEqual(target);
    });

    it('should handle null and undefined sources', () => {
      const target = { a: 1 };
      const result = utilsService.deepMerge({}, target, null, undefined, {
        b: 2,
      });
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });
});
