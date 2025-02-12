import { Test, TestingModule } from '@nestjs/testing';

import { ExploreService } from './explore.service';
import { ExploreModule } from './explore.module';

describe('ExploreService', () => {
  let app: TestingModule;
  let exploreService: ExploreService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [ExploreModule],
      providers: [],
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
});
