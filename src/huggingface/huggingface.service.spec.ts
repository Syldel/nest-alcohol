import { Test, TestingModule } from '@nestjs/testing';

import {
  EHFModel,
  HuggingFaceService,
} from '../huggingface/huggingface.service';
import { ConfigService } from '@nestjs/config';

import { HttpClientService } from '@services/http-client.service';
import { UtilsService } from '@services/utils.service';

describe('HuggingFaceService', () => {
  let app: TestingModule;
  let huggingFaceService: HuggingFaceService;

  let configServiceMock: jest.Mocked<ConfigService>;

  let httpClientServiceMock: jest.Mocked<HttpClientService>;
  let requestSpy: jest.SpyInstance;

  let utilsService: UtilsService;

  const fakeApiKey = 'fake-api-key';

  beforeAll(async () => {
    configServiceMock = {
      get: jest.fn().mockReturnValue(fakeApiKey),
    } as unknown as jest.Mocked<ConfigService>;

    httpClientServiceMock = {
      request: jest.fn(),
    } as unknown as jest.Mocked<HttpClientService>;

    app = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: HttpClientService,
          useValue: httpClientServiceMock,
        },
        UtilsService,
        HuggingFaceService,
      ],
    }).compile();

    huggingFaceService = app.get<HuggingFaceService>(HuggingFaceService);

    requestSpy = jest.spyOn(httpClientServiceMock, 'request');

    utilsService = app.get<UtilsService>(UtilsService);

    jest.spyOn(utilsService, 'waitSeconds').mockImplementation(() => {
      return new Promise((resolve) => resolve()); // Simuler une résolution immédiate sans délai
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeText', () => {
    it('should successfully analyze text with the provided model', async () => {
      const text = 'Some text to analyze';
      const modelKey = EHFModel.CAMEMBERT;

      const mockResponse = { result: 'success' };

      requestSpy.mockResolvedValue(mockResponse);

      const result = await huggingFaceService.analyzeText(text, modelKey);

      expect(result).toEqual(mockResponse);
      expect(requestSpy).toHaveBeenCalledWith(
        `https://api-inference.huggingface.co/models/${huggingFaceService.models[modelKey]}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${fakeApiKey}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ inputs: text }),
        }),
      );
    });

    it('should retry 2 times on failure and then fail', async () => {
      const text = 'Some text to analyze';
      const modelKey = EHFModel.CAMEMBERT;

      requestSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      jest.spyOn(console, 'error').mockImplementation();

      const result = await huggingFaceService.analyzeText(text, modelKey);

      expect(result).toBeNull();

      expect(requestSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract and parse Object with JSON in code blocks - with line breaks', () => {
      const input = [
        {
          generated_text:
            'Here is the country information:\n```json\n{"name":{"en":"France","fr":"France"},"cca2":"FR","cca3":"FRA","flag":"🇫🇷"}\n```',
        },
      ];

      const result = huggingFaceService.extractCodeBlocks(input);

      expect(result).toEqual([
        {
          name: {
            en: 'France',
            fr: 'France',
          },
          cca2: 'FR',
          cca3: 'FRA',
          flag: '🇫🇷',
        },
      ]);
    });

    it('should extract and parse Object with JSON in code blocks - without line breaks', () => {
      const generated_text =
        'Le pays correspondant à la distillerie de Togouchi Premium Whisky Japonais est le Japon avec ces codes : ' +
        '```json' +
        '{' +
        '  "name": {' +
        '    "en": "Japan",' +
        '    "fr": "Japon"' +
        '  },' +
        '  "cca2": "JP",' +
        '  "cca3": "JPN",' +
        '  "flag": "🇯🇵",' +
        '  "sub": null' +
        '}' +
        '```';
      const input = [
        {
          generated_text,
        },
      ];

      const result = huggingFaceService.extractCodeBlocks(input);

      expect(result).toEqual([
        {
          name: {
            en: 'Japan',
            fr: 'Japon',
          },
          cca2: 'JP',
          cca3: 'JPN',
          flag: '🇯🇵',
          sub: null,
        },
      ]);
    });

    it('should return {} when input is ```json {}```', () => {
      const input = [
        {
          generated_text: '```json {}```',
        },
      ];

      const result = huggingFaceService.extractCodeBlocks(input);

      expect(result).toEqual([{}]);
    });

    it('should return ? when input when there are 2 code blocks', () => {
      const input = [
        {
          generated_text:
            '```json {}``` AND ```json\n{"name":{"en":"France","fr":"France"},"cca2":"FR","cca3":"FRA","flag":"🇫🇷"}\n```',
        },
      ];

      const result = huggingFaceService.extractCodeBlocks(input);

      expect(result).toEqual([
        {},
        {
          name: { en: 'France', fr: 'France' },
          cca2: 'FR',
          cca3: 'FRA',
          flag: '🇫🇷',
        },
      ]);
    });

    it('should return null when input is null or undefined', () => {
      const nullResult = huggingFaceService.extractCodeBlocks(null);
      expect(nullResult).toBeNull();

      const undefinedResult = huggingFaceService.extractCodeBlocks(undefined);
      expect(undefinedResult).toBeNull();
    });
  });
});
