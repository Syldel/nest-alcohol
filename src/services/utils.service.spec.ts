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
});
