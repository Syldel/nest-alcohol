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

    it('should extract the ID from URLs - type 2', () => {
      expect(
        extractImageId(
          `${urlStart}ec63bb3c-f08b-4c30-84a0-65c704bedfee.__CR0,0,300,600_PT0_SX150_V1___.png`,
        ),
      ).toBe('ec63bb3c-f08b-4c30-84a0-65c704bedfee');

      expect(
        extractImageId(`${urlStart}ec63bb3c-f08b-4c30-84a0-65c704bedfee.png`),
      ).toBe('ec63bb3c-f08b-4c30-84a0-65c704bedfee');
    });

    it('should return null for invalid URLs', () => {
      expect(extractImageId(`${urlStart}invalidURL`)).toBeNull();
      expect(extractImageId('URL_sans_format')).toBeNull();
    });
  });

  describe('extractImageParamsFromUrl', () => {
    const urlStart = 'https://m.media-mywebsite.com/images/I/';
    const extractImageParams = (url: string) =>
      exploreService['extractImageParamsFromUrl'](url);

    it('should extract the image params from URLs', () => {
      expect(
        extractImageParams(
          `${urlStart}ec63bb3c-f08b-4c30-84a0-65c704bedfee.__CR0,0,300,600_PT0_SX150_V1___.png`,
        ),
      ).toBe('__CR0,0,300,600_PT0_SX150_V1___');

      expect(
        extractImageParams(
          `${urlStart}919-LiF+7PL._AC_QL95_SX300_SY250_FMwebp_.jpg`,
        ),
      ).toBe('_AC_QL95_SX300_SY250_FMwebp_');

      expect(extractImageParams(`${urlStart}test.jpg`)).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(extractImageParams(`${urlStart}invalidURL`)).toBeNull();
      expect(extractImageParams('URL_sans_format')).toBeNull();
    });
  });

  describe('processImageUrl', () => {
    let urlIdSpy: jest.SpyInstance;
    let urlParamsSpy: jest.SpyInstance;

    beforeEach(() => {
      if (urlIdSpy) urlIdSpy.mockClear();
      if (urlParamsSpy) urlParamsSpy.mockClear();
    });

    it('should return concatenated ID and params when valid URL is provided', () => {
      const validUrl =
        'https://example.com/image/123.__CR0,0,300,600_PT0_SX150_V1___.png';

      urlIdSpy = jest
        .spyOn(exploreService as any, 'extractImageIdFromUrl')
        .mockReturnValue('123');
      urlParamsSpy = jest
        .spyOn(exploreService as any, 'extractImageParamsFromUrl')
        .mockReturnValue('__CR0,0,300,600_PT0_SX150_V1___');

      const result = exploreService['processImageUrl'](validUrl);

      expect(result).toBe('123.__CR0,0,300,600_PT0_SX150_V1___');
      expect(urlIdSpy).toHaveBeenCalledTimes(1);
      expect(urlParamsSpy).toHaveBeenCalledTimes(1);
    });

    it('should return only image ID when params are not requested', () => {
      const validUrl =
        'https://example.com/image/123.__CR0,0,300,600_PT0_SX150_V1___.png';

      urlIdSpy = jest
        .spyOn(exploreService as any, 'extractImageIdFromUrl')
        .mockReturnValue('123');
      urlParamsSpy = jest
        .spyOn(exploreService as any, 'extractImageParamsFromUrl')
        .mockReturnValue(null);

      const result = exploreService['processImageUrl'](validUrl, false);

      expect(result).toBe('123');
      expect(urlIdSpy).toHaveBeenCalledTimes(1);
      expect(urlParamsSpy).toHaveBeenCalledTimes(0);
    });

    it('should return null when URL is invalid', () => {
      const invalidUrl = 'invalid-url';

      urlIdSpy = jest
        .spyOn(exploreService as any, 'extractImageIdFromUrl')
        .mockReturnValue(null);
      jest.spyOn(console, 'error').mockImplementation();

      const result = exploreService['processImageUrl'](invalidUrl);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(`URL invalide: ${invalidUrl}`);
    });
  });

  describe('optimizeHtml', () => {
    const optimizeHtml = (input: string) => exploreService.optimizeHtml(input);

    it('should remove <script> tags from the content', () => {
      const inputHtml = `
            <h1>Hello</h1>
            <script>console.log('test');</script>
        `;
      const expectedHtml = `
            <h1>Hello</h1>
        `;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove <style> tags from the content', () => {
      const inputHtml = `
            <h1>Hello</h1>
            <style>body { color: red; }</style>
        `;
      const expectedHtml = `
            <h1>Hello</h1>
        `;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove comments from the content', () => {
      const inputHtml = `
            <h1>Hello</h1>
            <!-- This is a comment -->
        `;
      const expectedHtml = `
            <h1>Hello</h1>
        `;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove comments from the content - case 2', () => {
      const inputHtml = `<div><!-- foo --> bar <!-- baz --></div>`;
      const expectedHtml = `<div> bar </div>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should handle plain text content without any HTML', () => {
      const inputHtml = `Just some plain text`;
      const expectedHtml = `Just some plain text`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should not modify valid tags that are not <script>, <style>, or comments', () => {
      const inputHtml = `
            <h1>Hello</h1>
            <p>This is a paragraph.</p>
        `;
      const expectedHtml = `
            <h1>Hello</h1> <p>This is a paragraph.</p>
        `;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove useless elements', () => {
      const inputHtml = `
            <h3> <span>Description du produit</span> </h3> <p> </p><p><span>Description du produit<br>Mortlach 12 ans est vieilli en fûts de Bourbon et de Xérès, non tourbé, il se distingue par son intensité, mais aussi par son caractère aérien, léger et vif. Doté d’une complexité particulière pour un malt de cet âge, cette référence possède un profil aromatique équilibré avec des arômes fruités et épicés accompagnés de notes fraîches et florales. Ce whisky associe la puissance structurelle d’un Single Malt au raffinement et à la complexité des plus grands blends.</span></p><p><span>Mode d'emploi<br>Stocker dans un endroit frais et sec</span></p> <p></p> <h3> <span>Mode d'emploi</span> </h3> <p> <span>Stocker dans un endroit frais et sec</span> </p> <div class="a-row a-expander-container a-expander-extend-container"> </div>
        `;
      const expectedHtml = `
            <h3> <span>Description du produit</span> </h3> <p> </p><p><span>Description du produit<br>Mortlach 12 ans est vieilli en fûts de Bourbon et de Xérès, non tourbé, il se distingue par son intensité, mais aussi par son caractère aérien, léger et vif. Doté d’une complexité particulière pour un malt de cet âge, cette référence possède un profil aromatique équilibré avec des arômes fruités et épicés accompagnés de notes fraîches et florales. Ce whisky associe la puissance structurelle d’un Single Malt au raffinement et à la complexité des plus grands blends.</span></p><p><span>Mode d'emploi<br>Stocker dans un endroit frais et sec</span></p> <h3> <span>Mode d'emploi</span> </h3> <p> <span>Stocker dans un endroit frais et sec</span> </p> <div> </div>
        `;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove useless elements - full case', () => {
      const inputHtml = `<div>
        <!-- This is a comment -->
        <script>alert('Hello');</script>
        <style>body { color: red; }</style>
        <iframe src="https://example.com"></iframe>
        <noscript>This browser does not support JavaScript.</noscript>
        <base href="https://example.com" />
        <link rel="stylesheet" href="styles.css" />
        
        <div class="container" style="margin: 0;">
            <h1 onclick="alert('Click!')">Hello, World!</h1>
            <p data-tracking="true">Welcome to the test.</p>
            <a href="">Empty link</a>
            <a>Missing href</a>
            <a href="https://example.com">Valid link</a>
            <div></div>
            <img src="image.jpg" width="100" height="200" />
            <img src="image2.jpg" />
            <br />
        </div>
      </div>`;
      const expectedHtml = `<div> <div> <h1>Hello, World!</h1> <p>Welcome to the test.</p> <a href="https://example.com">Valid link</a> <img src="image.jpg" width="100" height="200"/> <img src="image2.jpg"/> <br/> </div> </div>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should replace span.a-text-bold with strong', () => {
      const inputHtml = `<p>Un bon <span class="a-text-bold">single malt whisky</span> est apprécié.</p>`;
      const expectedHtml = `<p>Un bon <strong>single malt whisky</strong> est apprécié.</p>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });
  });

  describe('getFirstValidElement', () => {
    const getFirstValidElement = (
      ...args: [any, string, 'text' | 'href', number?]
    ) => exploreService.getFirstValidElement(...args);

    // Créer un mock de l'API Cheerio
    const mockCheerioAPI = {
      length: 0,
      eq: jest.fn(),
      text: jest.fn(),
      attr: jest.fn(),
    };
    let $: jest.Mock;

    beforeEach(() => {
      mockCheerioAPI.length = 0;
      mockCheerioAPI.eq.mockReset();
      mockCheerioAPI.text.mockReset();
      mockCheerioAPI.attr.mockReset();

      // Créer une fonction $ qui retourne notre API mockée
      $ = jest.fn(() => mockCheerioAPI);
    });

    it('should return the first valid text', () => {
      mockCheerioAPI.length = 3;
      mockCheerioAPI.eq.mockImplementation((index) => {
        if (index === 0) return { text: () => '  ', attr: () => null };
        if (index === 1) return { text: () => 'Valid Text', attr: () => null };
        return { text: () => '', attr: () => null };
      });

      const result = getFirstValidElement($, '.a-link-normal', 'text');
      expect(result).toBe('Valid Text');
      expect(mockCheerioAPI.eq).toHaveBeenCalledTimes(2);
    });

    it('should return the first valid href', () => {
      mockCheerioAPI.length = 4;
      mockCheerioAPI.eq.mockImplementation((index) => {
        if (index === 0) return { text: () => null, attr: () => null };
        if (index === 1) return { text: () => null, attr: () => null };
        if (index === 2)
          return { text: () => null, attr: () => 'https://example.com' };
        return { text: () => null, attr: () => '' };
      });

      const result = getFirstValidElement($, '.a-link-normal', 'href');
      expect(result).toBe('https://example.com');
      expect(mockCheerioAPI.eq).toHaveBeenCalledTimes(3);
    });

    it('should return null if no valid text is found', () => {
      mockCheerioAPI.length = 2;
      mockCheerioAPI.eq.mockImplementation(() => ({
        text: () => '',
        attr: () => null,
      }));

      const result = getFirstValidElement($, '.a-link-normal', 'text');
      expect(result).toBeNull();
      expect(mockCheerioAPI.eq).toHaveBeenCalledTimes(2);
    });

    it('should return null if no valid href is found', () => {
      mockCheerioAPI.length = 2;
      mockCheerioAPI.eq.mockImplementation(() => ({
        text: () => null,
        attr: () => null,
      }));

      const result = getFirstValidElement($, '.a-link-normal', 'href');
      expect(result).toBeNull();
      expect(mockCheerioAPI.eq).toHaveBeenCalledTimes(2);
    });

    it('should return null if selector matches no elements', () => {
      mockCheerioAPI.length = 0;

      const result = getFirstValidElement($, '.non-existent', 'text');
      expect(result).toBeNull();
      expect(mockCheerioAPI.eq).not.toHaveBeenCalled();
    });
  });
});
