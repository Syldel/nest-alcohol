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
        '<h3> <span>Description du produit</span> </h3> <p><span>Description du produit<br>Bulleit 10 ans, issu de réserves sélectionnées par Tom Bulleit, arrière petit-fils du fondateur de la distillerie, est une nouvelle expression du Bulleit Bourbon.</p></span> <div class=\"a-expander-content\">Voir plus</div>';
      const result = utilsService.cleanHtml(html);
      expect(result).toBe(expected);
    });

    it('should remove data-*', () => {
      const htmlInput = `<div data-csa-c-func-deps="aui-da-a-expander-toggle" data-csa-c-type="widget" data-csa-interaction-events="click" aria-expanded="false" role="button" href="javascript:void(0)" data-action="a-expander-toggle" class="a-expander-header a-declarative a-expander-extend-header" data-csa-c-id="16tcau-kqx4td-64fhow-kx7t4f">
  <i class="a-icon a-icon-extender-expand"></i><span class="a-expander-prompt">Voir plus</span></div>`;
      const expected =
        '<div aria-expanded=\"false\" role=\"button\" href=\"javascript:void(0)\" class=\"a-expander-header a-declarative a-expander-extend-header\"> <i class=\"a-icon a-icon-extender-expand\"></i><span class=\"a-expander-prompt\">Voir plus</span></div>';
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

    it('should remove display none', () => {
      const htmlInput = `<h3> <span>Description du produit</span> </h3><div data-expanded="false" class="a-expander-content a-expander-extend-content" style="display:none">    <h3> <span>Avertissement De Sûreté</span> </h3>        <p> <span>Interdiction de vente de boissons alcooliques aux mineurs de moins de 18 ans</span>  </p>        </div> <p>Après display none</p>`;
      const expected =
        '<h3> <span>Description du produit</span> </h3> <p>Après display none</p>';
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
});
