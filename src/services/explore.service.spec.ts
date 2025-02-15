import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { ExploreService } from './explore.service';
import { UtilsService } from './utils.service';
import { JsonService } from './json.service';
import { AlcoholService } from '../alcohol/alcohol.service';

describe('ExploreService', () => {
  let app: TestingModule;
  let exploreService: ExploreService;
  let mockAlcoholService: jest.Mocked<AlcoholService>;

  beforeAll(async () => {
    mockAlcoholService = {
      findAll: jest.fn().mockReturnValue(['Mock Whiskey', 'Mock Vodka']),
      // findOne: jest.fn().mockImplementation((id: number) => `Mock Alcohol ${id}`),
      create: jest
        .fn()
        .mockImplementation((data: any) => `Mock Alcohol ${data.name} created`),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<AlcoholService>;

    app = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: AlcoholService,
          useValue: mockAlcoholService,
        },
        ConfigService,
        ExploreService,
        UtilsService,
        JsonService,
      ],
    }).compile();

    exploreService = app.get<ExploreService>(ExploreService);
  });

  describe('extractASIN', () => {
    it('should extract ASIN when URL contains valid /dp/ pattern', () => {
      const url = 'https://test.com/dp/B07PXGQC1Q';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07PXGQC1Q');
    });

    it('should extract ASIN when URL contains valid /dp/ pattern and parameters after', () => {
      const url =
        'https://www.test.fr/JURA-Journey-Of-40-70cl/dp/B07BPQY7W1/ref=pd_bxgy_d_sccl_1';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07BPQY7W1');
    });

    it('should extract ASIN when URL contains valid /dp/ pattern and parameters after - case with ?', () => {
      const url =
        'https://www.test.fr/JURA-Journey-Of-40-70cl/dp/B07BPQY7W1?ref=pd_bxgy_d_sccl_1';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07BPQY7W1');
    });

    it('should extract 12 chars ASIN when URL contains valid /dp/ pattern and parameters after - case with ?', () => {
      const url =
        'https://www.test.fr/JURA-Journey-Of-40-70cl/dp/B07BPQY7W123?ref=pd_bxgy_d_sccl_1';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07BPQY7W123');
    });

    it('should extract ASIN when URL contains valid /dp/ pattern and parameters after - case with / and ?', () => {
      const url =
        'https://www.test.fr/dp/B07BPLMSMC/ref=ox_sc_act_image_1?smid=A1Y2OKY0Y01J81';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07BPLMSMC');
    });

    it('should extract ASIN when URL contains valid /gp/product/ pattern and parameters after - case with / and ?', () => {
      const url =
        'https://www.test.fr/gp/product/B07BPLMSMC/ref=ox_sc_act_image_1?smid=A1Y2OKY0Y01J81';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07BPLMSMC');
    });

    it('should extract ASIN with relative link', () => {
      const url = '/JURA-10-ans-Single-Whisky/dp/B07BPLMSMC';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07BPLMSMC');
    });

    it('should extract ASIN from encoded URL', () => {
      const encodedUrl = 'https%3A%2F%2Ftest.com%2Fdp%2FB07PXGQC1Q';
      const result = exploreService.extractASIN(encodedUrl);
      expect(result).toBe('B07PXGQC1Q');
    });

    it('should return null when URL is empty', () => {
      const result = exploreService.extractASIN('');
      expect(result).toBeNull();
    });

    // it('should return null when URL has invalid encoding', () => {
    //   const invalidUrl = '%invalid%encoding/dp/B07PXGQC1Q';
    //   const result = exploreService.extractASIN(invalidUrl);
    //   expect(result).toBeNull();
    // });

    it('should extract first matching ASIN when multiple /dp/ patterns exist', () => {
      const url = 'https://test.com/dp/B07PXGQC1Q/something/dp/B07ABCDEFG';
      const result = exploreService.extractASIN(url);
      expect(result).toBe('B07PXGQC1Q');
    });
  });

  describe('extractImageIdFromUrl', () => {
    const urlStart = 'https://m.media-mywebsite.com/images/I/';
    const extractImageId = (url: string) =>
      exploreService['extractImageIdFromUrl'](url);

    it('should extract the ID from URLs', () => {
      expect(extractImageId(`${urlStart}71Tx4KY27pL._AC_SX569_.jpg`)).toBe(
        '71Tx4KY27pL',
      );
      expect(
        extractImageId(`${urlStart}31n2Lf75z+L._AC_UF456,456_SR456,456_.jpg`),
      ).toBe('31n2Lf75z+L');
      expect(extractImageId(`${urlStart}41Vbn6BMbnL.jpg`)).toBe('41Vbn6BMbnL');
      expect(extractImageId(`${urlStart}31oRDoYfpmL._AC_SR38,50_.webp`)).toBe(
        '31oRDoYfpmL',
      );
      expect(extractImageId(`${urlStart}31oRDoYfpmL._AC_SR38,50_.png`)).toBe(
        '31oRDoYfpmL',
      );
      expect(extractImageId(`${urlStart}31oRDoYfpmL._AC_SR38,50_.jpg`)).toBe(
        '31oRDoYfpmL',
      );
      expect(extractImageId(`${urlStart}51DF9UDYU-L._AC_SR38,50_.jpg`)).toBe(
        '51DF9UDYU-L',
      );
      expect(extractImageId(`${urlStart}71Y5e2sa2cL._AC_SX342_.jpg`)).toBe(
        '71Y5e2sa2cL',
      );
      expect(
        extractImageId(`${urlStart}61pYbK0-aZL._AC_UL165_SR165,165_.jpg`),
      ).toBe('61pYbK0-aZL');
      expect(
        extractImageId(
          `${urlStart}919NLiFH7PL._AC_QL95_SX300_SY250_FMwebp_.jpg`,
        ),
      ).toBe('919NLiFH7PL');
      expect(extractImageId(`${urlStart}51rligm7F-L.SX522_.jpg`)).toBe(
        '51rligm7F-L',
      );
      expect(
        extractImageId(`${urlStart}51-b9+q4PBL._AC_UF480,480_SR480,480_.jpg`),
      ).toBe('51-b9+q4PBL');
      expect(extractImageId(`${urlStart}716ss+MMUvL._AC_SX522_.jpg`)).toBe(
        '716ss+MMUvL',
      );
      expect(
        extractImageId(`${urlStart}31n2Lf75z+L._AC_UF456,456_SR456,456_.jpg`),
      ).toBe('31n2Lf75z+L');
      expect(extractImageId(`${urlStart}61zvnW0cNOL._AC_SL1500_.jpg`)).toBe(
        '61zvnW0cNOL',
      );
      expect(
        extractImageId(`${urlStart}71T3+UKOgfL._AC_UL232_SR232,232_.jpg`),
      ).toBe('71T3+UKOgfL');
      expect(
        extractImageId(`${urlStart}617qDXACIxL._AC_something_else_.jpg`),
      ).toBe('617qDXACIxL');
      expect(
        extractImageId(`${urlStart}anotherId._AC_ANOTHER_FORMAT_123_.jpg`),
      ).toBe('anotherId');
    });

    it('should return null for invalid URLs', () => {
      expect(extractImageId(`${urlStart}invalidURL`)).toBeNull();
      expect(extractImageId('URL_sans_format')).toBeNull();
    });
  });
});
