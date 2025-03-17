import { Test, TestingModule } from '@nestjs/testing';

import * as fs from 'fs-extra';

import { JsonProcessingService } from './json-processing.service';

describe('JsonProcessingService', () => {
  let service: JsonProcessingService;

  const testFilePath = 'jsons/test.json';
  const outputFilePath = 'jsons/output.json';

  const writeJsonFile = async (filePath: string, data: any) => {
    await fs.writeJson(filePath, data, { spaces: 2 });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JsonProcessingService],
    }).compile();

    service = module.get<JsonProcessingService>(JsonProcessingService);
  });

  afterEach(async () => {
    await fs.remove(testFilePath);
    await fs.remove(outputFilePath);
  });

  describe('Sample data 1', () => {
    const processLine = (line: any) => {
      line.processed = true;
      return line;
    };

    const sampleData = [
      { name: 'France' },
      { name: 'Germany' },
      { name: 'Spain' },
    ];

    beforeEach(async () => {
      await writeJsonFile(testFilePath, sampleData);
    });

    it('should process each line of the JSON file', async () => {
      const mockProcessLine = jest.fn(processLine);
      await service.processJsonFile(testFilePath, mockProcessLine);
      expect(mockProcessLine).toHaveBeenCalledTimes(sampleData.length);
    });

    it('should write the modified JSON file', async () => {
      await service.processAndWriteJson(
        testFilePath,
        outputFilePath,
        processLine,
      );
      const outputData = await fs.readJson(outputFilePath);
      expect(outputData).toEqual(sampleData.map(processLine));
    });
  });

  describe('Sample data 2', () => {
    const sampleData = {
      meta: { version: 1 },
      data: [
        { country: { en: 'Japan', fr: 'Japon' } },
        { country: { en: 'Germany', fr: 'Allemagne' } },
        { country: { en: 'Spain', fr: 'Espagne' } },
      ],
    };

    const processLine = (line: any) => {
      console.log('processLine', line);
      if (line.country?.en) {
        line.country.en = line.country.en.toUpperCase();
      }
      return line;
    };

    beforeEach(async () => {
      await writeJsonFile(testFilePath, sampleData);
    });

    it('should process each line of the JSON file', async () => {
      const mockProcessLine = jest.fn(processLine);
      await service.processJsonFile(testFilePath, mockProcessLine, 'data');
      expect(mockProcessLine).toHaveBeenCalledTimes(sampleData.data.length);
    });

    it('should modify the JSON dynamically based on targetPath', async () => {
      await service.processAndWriteJson(
        testFilePath,
        outputFilePath,
        processLine,
        'data',
      );
      const outputData = await fs.readJson(outputFilePath);
      expect(outputData).toEqual({
        meta: { version: 1 },
        data: [
          { country: { en: 'JAPAN', fr: 'Japon' } },
          { country: { en: 'GERMANY', fr: 'Allemagne' } },
          { country: { en: 'SPAIN', fr: 'Espagne' } },
        ],
      });
    });
  });

  describe('setValueByPath', () => {
    it('should update the value at the specified path in the object', () => {
      const obj = { a: { b: { c: 'old' } } };
      service.setValueByPath(obj, 'a.b.c', 'new');
      expect(obj.a.b.c).toBe('new');
    });

    it('should handle the root level update when path is empty', () => {
      const obj = { a: 1, b: 2 };
      service.setValueByPath(obj, '', { a: 3, b: 4 });
      expect(obj.a).toBe(3);
      expect(obj.b).toBe(4);
    });

    it('should throw an error if the path is invalid', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(() => service.setValueByPath(obj, 'a.x.c', 'new')).toThrow(
        'Path x not found in the object',
      );
    });

    it('should handle an array in the path correctly', () => {
      const obj = { items: [{ id: 1 }, { id: 2 }] };
      service.setValueByPath(obj, 'items.1.id', 3);
      expect(obj.items[1].id).toBe(3);
    });

    it('should update nested properties correctly', () => {
      const obj = { a: { b: { c: { d: 'value' } } } };
      service.setValueByPath(obj, 'a.b.c.d', 'newValue');
      expect(obj.a.b.c.d).toBe('newValue');
    });
  });
});
