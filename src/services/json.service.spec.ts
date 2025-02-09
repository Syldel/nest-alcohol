import { Test, TestingModule } from '@nestjs/testing';

import { JsonService } from './json.service';

describe('JsonService', () => {
  let app: TestingModule;
  let jsonService: JsonService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      providers: [JsonService],
    }).compile();

    jsonService = app.get<JsonService>(JsonService);
  });

  it('should write, read, remove Json file', async () => {
    const testFileName = 'test.json';
    const writeResult = await jsonService.writeJsonFile(testFileName, {
      data: { test: 'value' },
    });
    expect(writeResult).toBeTruthy();

    const readResult = await jsonService.readJsonFile(testFileName);
    expect(readResult).toEqual(
      expect.objectContaining({ data: { test: 'value' } }),
    );

    const rmResult = await jsonService.removeFile(testFileName);
    expect(rmResult).toBeTruthy();
  });
});
