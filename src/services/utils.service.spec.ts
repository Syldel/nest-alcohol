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
});
