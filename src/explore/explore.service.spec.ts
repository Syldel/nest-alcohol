import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { confirm } from '@clack/prompts';

import { SharedModule } from '@services/shared.module';
import { ExploreService, IRegionCountry } from './explore.service';
import { AlcoholService } from '../alcohol/alcohol.service';
import { CompressService } from '../compress/compress.service';
import { HuggingFaceService } from '../huggingface/huggingface.service';
import { CountryService, FilterOptions } from '../country/country.service';

jest.mock('@clack/prompts', () => ({
  confirm: jest.fn(),
}));

describe('ExploreService', () => {
  let app: TestingModule;
  let exploreService: ExploreService;
  let countryService: CountryService;
  let huggingFaceService: HuggingFaceService;
  let alcoholServiceMock: jest.Mocked<AlcoholService>;

  beforeAll(async () => {
    alcoholServiceMock = {
      findAll: jest.fn().mockReturnValue(['Mock Whiskey', 'Mock Vodka']),
      // findOne: jest.fn().mockImplementation((id: number) => `Mock Alcohol ${id}`),
      create: jest
        .fn()
        .mockImplementation((data: any) => `Mock Alcohol ${data.name} created`),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<AlcoholService>;

    app = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        {
          provide: AlcoholService,
          useValue: alcoholServiceMock,
        },
        ConfigService,
        ExploreService,
        CompressService,
        HuggingFaceService,
        CountryService,
      ],
    }).compile();

    exploreService = app.get<ExploreService>(ExploreService);
    countryService = app.get<CountryService>(CountryService);
    huggingFaceService = app.get<HuggingFaceService>(HuggingFaceService);
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

        <form method="post" action="/cart/add-to-cart/ref=emc_s_m_5_i_atc_c">
          <!-- sp:csrf -->
          <input type="hidden" name="anti-csrftoken-a2z" value="hNP+nYLZ2a0NgjDvsxMZ4k070ujAYYC6bj5OFVP/hIIyAAAAAGfFha9hYjA5NzNkYi04YzQ4LTRkOGMtOWFiZS01NDEyYjE1ZDYzY2E=">
          <!-- sp:end-csrf -->
          <input type="hidden" name="items[0.base][asin]" value="B07RQ8TP9Q">
          <input type="hidden" name="items[0.base][offerListingId]" value="lvcrlvlZubfLiBhbD74IjGukWYtODH6YWLsbRNAi1FSWb7CXLDkBqLDTVLIhnvXUYz0CPXWEzbJ1VqXBP5li%2BNSWAr4mHnINpz8XY9nCCi46851vTa4USDh2whgA1HsLysobvM9kH7s%3D"> <input type="hidden" name="items[0.base][quantity]" value="1"> <input type="hidden" name="clientName" value="Aplus_BuyableModules_DetailPage">
          <div class="add-to-cart">
            <span class="a-button a-spacing-small a-button-primary a-button-icon" id="a-autoid-25">
              <span class="a-button-inner">
                <i class="a-icon a-icon-cart"></i>
                <input class="a-button-input" type="submit" aria-labelledby="a-autoid-25-announce">
                <span class="a-button-text" aria-hidden="true" id="a-autoid-25-announce"> Ajouter au panier </span>
              </span>
            </span>
          </div>
        </form>
      </div>`;
      const expectedHtml = `<div> <div> <h1>Hello, World!</h1> <p>Welcome to the test.</p> <img src="image.jpg" width="100" height="200"> <img src="image2.jpg"> <br> </div> <form method="post" action="/cart/add-to-cart/ref=emc_s_m_5_i_atc_c"> <div> <span id="a-autoid-25"> <span> <span aria-hidden="true" id="a-autoid-25-announce"> Ajouter au panier </span> </span> </span> </div> </form> </div>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove data attributes', () => {
      const inputHtml = `<div data-id="123" data-user="john" class="test"><p data-info="test" onclick="alert('Hello')">Hello World</p></div>`;
      const expectedHtml = `<div><p>Hello World</p></div>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove several things and data attributes', () => {
      const inputHtml = `          <!-- show up to 2 reviews by default -->
               <h3> <span>Description du produit</span> </h3>        <p> <span>J&amp;B Whisky 70cl.</span>  </p>          <h3> <span>Ingrédients</span> </h3>        <p> <span>J&amp;B Rare est un whisky écossais composé de 36 single malts et 6 whiskies de grains soigneusement assemblés selon la recette de Charlie Julian. Parfaitement équilibré, J&amp;B est un whisky de qualité, subtil, élégant qui n’a pas peur de casser les codes : sa bouteille verte et son étiquette jaune distinguent nettement J&amp;B Rare des autres whiskies. Révéler son caractère authentique et sa fraîcheur en le dégustant sec, sur glace ou en cocktail.</span>  </p>          <div data-a-expander-name="toggle_description" class="a-row a-expander-container a-expander-extend-container"> <script>
                  P.when('A').execute(function(A) {
                      A.on('a:expander:toggle_description:toggle:collapse', function(data) {
                        window.scroll(0, data.expander.$expander[0].offsetTop-100);
                      });
                    });
                </script>
                <div data-expanded="false" class="a-expander-content a-expander-extend-content" style="overflow: hidden;">    <h3> <span>Mode d'emploi</span> </h3>        <p> <span>Stocker dans un endroit frais et sec</span>  </p>          <h3> <span>Avertissement De Sûreté</span> </h3>        <p> <span>Not for sale to minors. Alcohol abuse is dangerous for health. To consume with moderation</span>  </p>          <h3> <span>Clause de non-garantie</span> </h3>        <p> <span>Photographie non contractuelle. Les indications ci-dessus sont données à titre d'information. Elles ne sont pas forcément exhaustives et ne sauraient se substituer aux informations figurant sur l'emballage du produit qui font seules foi, et auxquelles vous êtes invités à vous reporter, notamment en cas d'intolérance alimentaire.</span>  </p>        </div> <div data-csa-c-func-deps="aui-da-a-expander-toggle" data-csa-c-type="widget" data-csa-interaction-events="click" aria-expanded="false" role="button" href="javascript:void(0)" data-action="a-expander-toggle" class="a-expander-header a-declarative a-expander-extend-header" data-a-expander-toggle="{&quot;allowLinkDefault&quot;:true, &quot;expand_prompt&quot;:&quot;Voir plus&quot;, &quot;collapse_prompt&quot;:&quot;Voir moins&quot;}" data-csa-c-id="di7swf-ejyd2h-bw84f1-j19l84"><i class="a-icon a-icon-extender-expand"></i><span class="a-expander-prompt">Voir plus</span></div> </div>`;
      const expectedHtml = `<h3> <span>Description du produit</span> </h3> <p> <span>J&B Whisky 70cl.</span> </p> <h3> <span>Ingrédients</span> </h3> <p> <span>J&B Rare est un whisky écossais composé de 36 single malts et 6 whiskies de grains soigneusement assemblés selon la recette de Charlie Julian. Parfaitement équilibré, J&B est un whisky de qualité, subtil, élégant qui n’a pas peur de casser les codes : sa bouteille verte et son étiquette jaune distinguent nettement J&B Rare des autres whiskies. Révéler son caractère authentique et sa fraîcheur en le dégustant sec, sur glace ou en cocktail.</span> </p> <div> <div> <h3> <span>Mode d'emploi</span> </h3> <p> <span>Stocker dans un endroit frais et sec</span> </p> <h3> <span>Avertissement De Sûreté</span> </h3> <p> <span>Not for sale to minors. Alcohol abuse is dangerous for health. To consume with moderation</span> </p> <h3> <span>Clause de non-garantie</span> </h3> <p> <span>Photographie non contractuelle. Les indications ci-dessus sont données à titre d'information. Elles ne sont pas forcément exhaustives et ne sauraient se substituer aux informations figurant sur l'emballage du produit qui font seules foi, et auxquelles vous êtes invités à vous reporter, notamment en cas d'intolérance alimentaire.</span> </p> </div> <div aria-expanded="false" role="button" href="javascript:void(0)"><span>Voir plus</span></div> </div>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove several things and links', () => {
      const inputHtml = `          <!-- show up to 2 reviews by default -->
               <h3> <span>Description du produit</span> </h3>        <p> <span>J&amp;B Whisky 70cl.</span>  </p>          <h3> <span>Ingrédients</span> </h3>        <p> <span>J&amp;B Rare est un whisky écossais composé de 36 single malts et 6 whiskies de grains soigneusement assemblés selon la recette de Charlie Julian. Parfaitement équilibré, J&amp;B est un whisky de qualité, subtil, élégant qui n’a pas peur de casser les codes : sa bouteille verte et son étiquette jaune distinguent nettement J&amp;B Rare des autres whiskies. Révéler son caractère authentique et sa fraîcheur en le dégustant sec, sur glace ou en cocktail.</span>  </p>          <div data-a-expander-name="toggle_description" class="a-row a-expander-container a-expander-extend-container"> <script>
                  P.when('A').execute(function(A) {
                      A.on('a:expander:toggle_description:toggle:collapse', function(data) {
                        window.scroll(0, data.expander.$expander[0].offsetTop-100);
                      });
                    });
                </script>
                <div data-expanded="false" class="a-expander-content a-expander-extend-content" style="overflow: hidden;">    <h3> <span>Mode d'emploi</span> </h3>        <p> <span>Stocker dans un endroit frais et sec</span>  </p>          <h3> <span>Avertissement De Sûreté</span> </h3>        <p> <span>Not for sale to minors. Alcohol abuse is dangerous for health. To consume with moderation</span>  </p>          <h3> <span>Clause de non-garantie</span> </h3>        <p> <span>Photographie non contractuelle. Les indications ci-dessus sont données à titre d'information. Elles ne sont pas forcément exhaustives et ne sauraient se substituer aux informations figurant sur l'emballage du produit qui font seules foi, et auxquelles vous êtes invités à vous reporter, notamment en cas d'intolérance alimentaire.</span>  </p>        </div> <a data-csa-c-func-deps="aui-da-a-expander-toggle" data-csa-c-type="widget" data-csa-interaction-events="click" aria-expanded="false" role="button" href="javascript:void(0)" data-action="a-expander-toggle" class="a-expander-header a-declarative a-expander-extend-header" data-a-expander-toggle="{&quot;allowLinkDefault&quot;:true, &quot;expand_prompt&quot;:&quot;Voir plus&quot;, &quot;collapse_prompt&quot;:&quot;Voir moins&quot;}" data-csa-c-id="di7swf-ejyd2h-bw84f1-j19l84"><i class="a-icon a-icon-extender-expand"></i><span class="a-expander-prompt">Voir plus</span></a> </div>`;
      const expectedHtml = `<h3> <span>Description du produit</span> </h3> <p> <span>J&B Whisky 70cl.</span> </p> <h3> <span>Ingrédients</span> </h3> <p> <span>J&B Rare est un whisky écossais composé de 36 single malts et 6 whiskies de grains soigneusement assemblés selon la recette de Charlie Julian. Parfaitement équilibré, J&B est un whisky de qualité, subtil, élégant qui n’a pas peur de casser les codes : sa bouteille verte et son étiquette jaune distinguent nettement J&B Rare des autres whiskies. Révéler son caractère authentique et sa fraîcheur en le dégustant sec, sur glace ou en cocktail.</span> </p> <div> <div> <h3> <span>Mode d'emploi</span> </h3> <p> <span>Stocker dans un endroit frais et sec</span> </p> <h3> <span>Avertissement De Sûreté</span> </h3> <p> <span>Not for sale to minors. Alcohol abuse is dangerous for health. To consume with moderation</span> </p> <h3> <span>Clause de non-garantie</span> </h3> <p> <span>Photographie non contractuelle. Les indications ci-dessus sont données à titre d'information. Elles ne sont pas forcément exhaustives et ne sauraient se substituer aux informations figurant sur l'emballage du produit qui font seules foi, et auxquelles vous êtes invités à vous reporter, notamment en cas d'intolérance alimentaire.</span> </p> </div> </div>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should remove data-*, style and class elements', () => {
      const inputHtml = `<div>
        <p style="display:none;">This paragraph should be removed</p>
        <span>Visible text</span>
        <div style="color: red; display:none;">Hidden div</div>
        <span>Visible text 2</span>
        <div style="color: red; display:none;"><p><span>Hidden div with inside tags</span></p></div>
        <span>Visible text 3</span>
        <div data-expanded="false" class="a-expander-content a-expander-extend-content" style="overflow: hidden; display: none;">    <h3> <span>Mode d'emploi</span> </h3>        <p> <span>Stocker dans un endroit frais et sec</span>  </p></div>
      </div>`;
      const expectedHtml = `<div> <p>This paragraph should be removed</p> <span>Visible text</span> <div>Hidden div</div> <span>Visible text 2</span> <div><p><span>Hidden div with inside tags</span></p></div> <span>Visible text 3</span> <div> <h3> <span>Mode d'emploi</span> </h3> <p> <span>Stocker dans un endroit frais et sec</span> </p></div> </div>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should replace span.a-text-bold with strong', () => {
      const inputHtml = `<p>Un bon <span class="a-text-bold">single malt whisky</span> est apprécié.</p>`;
      const expectedHtml = `<p>Un bon <strong>single malt whisky</strong> est apprécié.</p>`;
      expect(optimizeHtml(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should return null when input HTML is empty string, null or undefined', () => {
      const resultEmptyString = optimizeHtml('');
      const resultNull = optimizeHtml(null);
      const resultUndefined = optimizeHtml(undefined);

      expect(resultEmptyString).toBeNull();
      expect(resultNull).toBeNull();
      expect(resultUndefined).toBeNull();
    });

    it('should handle unclosed tags and return well-formed HTML', () => {
      const inputHtml = `<div><p>Content <span class="a-text-bold">Bold Text`;
      const result = optimizeHtml(inputHtml);
      expect(result).toContain(
        '<div><p>Content <strong>Bold Text</strong></p></div>',
      );
      expect(result).not.toContain('<span');
    });
  });

  describe('extractCleanText', () => {
    const extractCleanText = (input: string) =>
      exploreService.extractCleanText(input);

    it('should extract clean text', () => {
      const inputHtml = `
      <div>
        <script>alert('Hello');</script>
        <p>This is a <a href="https://example.com">link</a> inside a paragraph.</p>
        <span>Some more text.</span>
      </div>
      `;
      const expectedHtml = `This is a inside a paragraph. Some more text.`;
      expect(extractCleanText(inputHtml).trim()).toBe(expectedHtml.trim());
    });

    it('should return null when input HTML is empty string, null or undefined', () => {
      const resultEmptyString = extractCleanText('');
      const resultNull = extractCleanText(null);
      const resultUndefined = extractCleanText(undefined);

      expect(resultEmptyString).toBeNull();
      expect(resultNull).toBeNull();
      expect(resultUndefined).toBeNull();
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

  describe('extractCSSAndHTML', () => {
    it('should extract CSS styles and return cleaned HTML', () => {
      const inputHTML = `
        <h2>Title</h2>
        <div class="container">
            <style>.container { color: red; }</style>
            <style>p { font-size: 16px; }</style>
            <p>Hello, World!</p>
        </div>`;

      const expectedCSS = [
        '.container { color: red; }',
        'p { font-size: 16px; }',
      ];
      const expectedHTML =
        `<h2>Title</h2> <div class="container"> <p>Hello, World!</p> </div>`.trim();

      const result = exploreService.extractCSSAndHTML(inputHTML);

      expect(result.css).toEqual(expectedCSS);
      expect(result.html).toBe(expectedHTML);
    });

    it('should return an empty CSS array if no styles are present', () => {
      const inputHTML = `<div><p>No styles here</p></div>`;
      const result = exploreService.extractCSSAndHTML(inputHTML);

      expect(result.css).toEqual([]);
      expect(result.html).toBe(`<div><p>No styles here</p></div>`);
    });

    it('should handle an empty string input', () => {
      const result = exploreService.extractCSSAndHTML('');

      expect(result.css).toEqual([]);
      expect(result.html).toBe('');
    });
  });

  describe('removeScriptsAndComments', () => {
    it('should remove input hidden', () => {
      const html = `
        <div class="apm-tablemodule">
    <table class="apm-tablemodule-table" cellspacing="0" cellpadding="0">
        <tbody>
            <tr class="apm-tablemodule-imagerows">
                <td class="apm-tablemodule-blankkeyhead">
                </td>
                <th>
                    <a href="/dp/B07X3SV77H?ref=emc_s_m_5_i_atc">
                        <div class="apm-tablemodule-image">
                            <img alt=""
                                src="/images/bb0c349a-745c-4873-84bb-e16caf0a6f75.__CR750,0,1500,3000_PT0_SX150_V1___.png"
                                width="121.66666666666667px">
                        </div>
                        <div>
                            Aberlour 10 ans </div>
                    </a>
                </th>
                <th>
                    <a href="/dp/B00LDNC01U?ref=emc_s_m_5_i_atc">
                        <div class="apm-tablemodule-image">
                            <img alt=""
                                src="/images/addfa177-da9f-477d-9aaa-cb60a4a9e9b2.__CR750,0,1500,3000_PT0_SX150_V1___.png"
                                width="121.66666666666667px">
                        </div>
                        <div>
                            Aberlour White Oak </div>
                    </a>
                </th>

            </tr>
            <tr class="NO_apm-tablemodule-atc">
                <td class="apm-tablemodule-blankkeyhead">

                </td>
                <td>
                    <div class="add-to-cart ">
                        <span class="a-button a-button-base" id="a-autoid-20"><span class="a-button-inner"><a
                                    href="/dp/B07X3SV77H?ref=emc_s_m_5_i_atc" class="a-button-text"
                                    id="a-autoid-20-announce"> Options d’achat </a></span></span>
                    </div>
                    <script type="application/javascript">
                        logShoppableMetrics("module-5", false)
                    </script>
                </td>

                <td>
                    <form method="post" action="/cart/add-to-cart/ref=emc_s_m_5_i_atc_c"> <!-- sp:csrf --><input
                            type="hidden" name="anti-csrftoken-a2z"
                            value="hBd2fhPGuy1/GGbjrF3tOOVyIXUAdPUDTj4d8s+90aXLAAAAAGfAdcBhYjA5NzNkYi04YzQ4LTRkOGMtOWFiZS01NDEyYjE1ZDYzY2E="><!-- sp:end-csrf -->
                        <input type="hidden" name="items[0.base][asin]" value="B01N5K7UCI"> <input type="hidden"
                            name="items[0.base][offerListingId]"
                            value="%2B602rq3SaZgjMxk8Y0sF%2B4Z1worktG%2Bd4bM7YkiLbs56G5HhvrFIrg4LgSA%2FB60bQlsXYft7b8KMMwd3O8%2BlXSq9ZCTqhfv1trcfESwc7N37dtGjMm1jv5mHSqfimDPL0%2BaBBBP8jxA%3D">
                        <input type="hidden" name="items[0.base][quantity]" value="1"> <input type="hidden"
                            name="clientName" value="Aplus_BuyableModules_DetailPage">
                        <div class="add-to-cart">
                            <span class="a-button a-spacing-small a-button-primary a-button-icon" id="a-autoid-25"><span
                                    class="a-button-inner"><i class="a-icon a-icon-cart"></i><input
                                        class="a-button-input" type="submit"
                                        aria-labelledby="a-autoid-25-announce"><span class="a-button-text"
                                        aria-hidden="true" id="a-autoid-25-announce"> Ajouter au panier
                                    </span></span></span>
                        </div>
                    </form>
                    <script type="application/javascript">
                        logShoppableMetrics("module-5", true)
                    </script>
                </td>
            </tr>

        </tbody>
    </table>
</div>`;

      const expected = `<div class="apm-tablemodule">
    <table class="apm-tablemodule-table" cellspacing="0" cellpadding="0">
        <tbody>
            <tr class="apm-tablemodule-imagerows">
                <td class="apm-tablemodule-blankkeyhead">
                </td>
                <th>
                    <a href="/dp/B07X3SV77H">
                        <div class="apm-tablemodule-image">
                            <img alt=""
                                src="/images/bb0c349a-745c-4873-84bb-e16caf0a6f75.__CR750,0,1500,3000_PT0_SX150_V1___.png"
                                width="121.66666666666667px">
                        </div>
                        <div>
                            Aberlour 10 ans </div>
                    </a>
                </th>
                <th>
                    <a href="/dp/B00LDNC01U">
                        <div class="apm-tablemodule-image">
                            <img alt=""
                                src="/images/addfa177-da9f-477d-9aaa-cb60a4a9e9b2.__CR750,0,1500,3000_PT0_SX150_V1___.png"
                                width="121.66666666666667px">
                        </div>
                        <div>
                            Aberlour White Oak </div>
                    </a>
                </th>

            </tr>
            <tr class="NO_apm-tablemodule-atc">
                <td class="apm-tablemodule-blankkeyhead">

                </td>
                <td>
                    <div class="add-to-cart ">
                        <span class="a-button a-button-base" id="a-autoid-20"><span class="a-button-inner"><a
                                    href="/dp/B07X3SV77H" class="a-button-text"
                                    id="a-autoid-20-announce"> Options d’achat </a></span></span>
                    </div>
                </td>

                <td>
                    <form method="post" action="/cart/add-to-cart/ref=emc_s_m_5_i_atc_c">
                        <div class="add-to-cart">
                            <span class="a-button a-spacing-small a-button-primary a-button-icon" id="a-autoid-25"><span
                                    class="a-button-inner"><i class="a-icon a-icon-cart"></i><input
                                        class="a-button-input" type="submit"
                                        aria-labelledby="a-autoid-25-announce"><span class="a-button-text"
                                        aria-hidden="true" id="a-autoid-25-announce"> Ajouter au panier
                                    </span></span></span>
                        </div>
                    </form>
                </td>
            </tr>

        </tbody>
    </table>
</div>`;

      const result = exploreService.removeScriptsAndComments(html);

      expect(result).toBe(expected.replace(/\s+/g, ' ').trim());
    });

    it('should remove apm-tablemodule-atc class', () => {
      const html = `
        <div class="apm-tablemodule">
          <table class="apm-tablemodule-table" cellspacing="0" cellpadding="0">
            <tbody>
              <tr class="apm-tablemodule-imagerows">
                  <td class="apm-tablemodule-blankkeyhead"> </td>
                  <th>
                    <a href="/dp/B008U7SV7E?ref=emc_s_m_5_i_atc">
                        <div class="apm-tablemodule-image"> <img alt=""
                                src="/images/9a5f044f-3ea2-4a22-a2ef-86e0b554ee04.__CR0,0,600,1200_PT0_SX150_V1___.jpg"
                                width="121.66666666666667px"></div>
                        <div> Signet Whisky </div>
                    </a>
                  </th>
              </tr>
              <tr class="apm-tablemodule-atc">
                  <td class="apm-tablemodule-blankkeyhead">

                  </td>
                  <td>
                      <div class="add-to-cart ">
                          <span class="a-button a-button-base" id="a-autoid-20"><span class="a-button-inner"><a
                                      href="/dp/B07X3SV77H?ref=emc_s_m_5_i_atc&test=1" class="a-button-text"
                                      id="a-autoid-20-announce"> Options d’achat </a></span></span>
                      </div>
                  </td>
                  <td>
                      <div class="add-to-cart"> <span class="a-button a-button-base"
                              id="a-autoid-24"><span class="a-button-inner"><a
                                      href="/dp/B00MUV6VD2?ref=emc_s_m_5_i_atc" class="a-button-text"
                                      id="a-autoid-24-announce"> Options d’achat </a></span></span> </div>
                  </td>
                  <td>
                      <div class="add-to-cart">
                        <span class="a-button a-spacing-small a-button-primary a-button-icon" id="a-autoid-25">
                          <span class="a-button-inner">
                            <i class="a-icon a-icon-cart" />
                            <input class="a-button-input" type="submit" aria-labelledby="a-autoid-25-announce">
                              <span class="a-button-text" aria-hidden="true" id="a-autoid-25-announce"> Ajouter au panier </span>
                            </input>
                          </span>
                        </span>
                      </div>
                  </td>
                </tr></tbody></table></div>`;

      const expected = `
        <div class="apm-tablemodule">
          <table class="apm-tablemodule-table" cellspacing="0" cellpadding="0">
            <tbody>
              <tr class="apm-tablemodule-imagerows">
                  <td class="apm-tablemodule-blankkeyhead"> </td>
                  <th>
                    <a href="/dp/B008U7SV7E">
                        <div class="apm-tablemodule-image"> <img alt=""
                                src="/images/9a5f044f-3ea2-4a22-a2ef-86e0b554ee04.__CR0,0,600,1200_PT0_SX150_V1___.jpg"
                                width="121.66666666666667px"></div>
                        <div> Signet Whisky </div>
                    </a>
                  </th>
              </tr>
            </tbody></table></div>
      `;

      const result = exploreService.removeScriptsAndComments(html);

      expect(result).toBe(expected.replace(/\s+/g, ' ').trim());
    });
  });

  describe('extractCountry', () => {
    let searchCountrySpy: jest.SpyInstance;
    let findMatchesSpy: jest.SpyInstance;
    let huggingFaceAnalyzeSpy: jest.SpyInstance;

    beforeEach(() => {
      if (searchCountrySpy) searchCountrySpy.mockClear();
      if (findMatchesSpy) findMatchesSpy.mockClear();
      if (huggingFaceAnalyzeSpy) huggingFaceAnalyzeSpy.mockClear();
    });

    it('should extract country information when country detail is present', async () => {
      searchCountrySpy = jest
        .spyOn(countryService as any, 'searchCountriesOrRegions')
        .mockReturnValueOnce([
          {
            iso: 'US',
            iso3: 'USA',
            names: { en: 'United States', fr: 'États-Unis' },
            regions: [{ names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' }],
          },
        ]);

      const details = [
        { legend: "Pays d'origine", value: 'United States' },
        { legend: 'Région de production', value: 'Kentucky' },
      ];

      const result = await exploreService['extractCountry'](
        '',
        details,
        '',
        '',
      );

      expect(searchCountrySpy).toHaveBeenCalledWith(
        'United States Kentucky',
        expect.any(Object),
      );
      expect(result).toEqual({
        iso: 'US',
        iso3: 'USA',
        names: { en: 'United States', fr: 'États-Unis' },
        regions: [{ names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' }],
      });
    });

    describe('findCountryMatches', () => {
      it('should extract country information when brand detail is present', async () => {
        findMatchesSpy = jest
          .spyOn(exploreService as any, 'findCountryMatches')
          .mockReturnValueOnce([
            {
              iso: 'US',
              iso3: 'USA',
              names: { en: 'United States', fr: 'États-Unis' },
              regions: [
                { names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' },
              ],
            },
          ]);

        const details = [
          { legend: 'Marque', value: 'Bulleit' },
          { legend: "Pays d'origine", value: 'United States' },
          { legend: 'Région de production', value: 'Kentucky' },
        ];

        const result = await exploreService['extractCountry'](
          '',
          details,
          '',
          '',
        );

        expect(findMatchesSpy).toHaveBeenCalledWith(
          'Bulleit',
          undefined,
          expect.any(Object),
        );
        expect(result).toEqual({
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [{ names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' }],
        });
      });

      it('should extract country information when brand detail is present - and returns several countries', async () => {
        findMatchesSpy = jest
          .spyOn(exploreService as any, 'findCountryMatches')
          .mockReturnValueOnce([
            {
              iso: 'US',
              iso3: 'USA',
              names: { en: 'United States', fr: 'États-Unis' },
              regions: [
                { names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' },
              ],
            },
            {
              iso: 'GB',
              iso3: 'GBR',
              names: { en: 'United Kingdom', fr: 'Royaume-Uni' },
              regions: [
                { names: { en: 'Scotland', fr: 'Écosse' }, iso: 'SCT' },
              ],
            },
          ]);

        const details = [
          { legend: 'Marque', value: 'Bulleit' },
          { legend: "Pays d'origine", value: 'United States' },
          { legend: 'Région de production', value: 'Kentucky' },
        ];

        const result = await exploreService['extractCountry'](
          '',
          details,
          '',
          '',
        );

        expect(findMatchesSpy).toHaveBeenCalledWith(
          'Bulleit',
          undefined,
          expect.any(Object),
        );
        expect(result).toEqual({
          iso: 'US',
          iso3: 'USA',
          names: { en: 'United States', fr: 'États-Unis' },
          regions: [{ names: { en: 'Kentucky', fr: 'Kentucky' }, iso: 'KY' }],
        });
      });
    });

    it('should call hugging face service when no matching are found', async () => {
      exploreService['countries'] = [
        {
          nationalities: ['irish', 'irlandais'],
          country: {
            en: 'Ireland',
            fr: 'Irlande',
          },
          whiskyDistilleries: ['Bushmills'],
          brands: {},
        },
      ];

      searchCountrySpy = jest
        .spyOn(countryService as any, 'searchCountriesOrRegions')
        .mockReturnValueOnce([]);

      const huggingFaceResult = [
        {
          generated_text:
            'Here is the country information:\n```json\n{"names":{"en":"France","fr":"France"},"iso":"FR","iso3":"FRA"}\n```',
        },
      ];

      huggingFaceAnalyzeSpy = jest
        .spyOn(huggingFaceService as any, 'analyzeText')
        .mockReturnValueOnce(huggingFaceResult);

      (confirm as unknown as jest.Mock).mockResolvedValueOnce(true);

      const result = await exploreService['extractCountry']('---', [], '', '');

      expect(searchCountrySpy).toHaveBeenCalledWith('---', expect.any(Object));
      expect(result).toEqual({
        iso: 'FR',
        iso3: 'FRA',
        names: { en: 'France', fr: 'France' },
      });
    });
  });

  describe('findCountryMatches', () => {
    const regionCountryMappings: IRegionCountry[] = [
      {
        nationalities: ['scottish'],
        regions: ['highland', 'speyside'],
        country: {
          en: 'Scotland',
          fr: 'Écosse',
        },
        whiskyDistilleries: ['glenlivet'],
        brands: {},
      },
      {
        nationalities: ['irish', 'irlandais'],
        country: {
          en: 'Ireland',
          fr: 'Irlande',
        },
        whiskyDistilleries: ['Bushmills'],
        brands: {},
      },
    ];
    const filterOptions: FilterOptions = { searchInText: true };

    let searchCountrySpy: jest.SpyInstance;

    beforeEach(() => {
      if (searchCountrySpy) searchCountrySpy.mockClear();
      searchCountrySpy = jest
        .spyOn(countryService as any, 'searchCountriesOrRegions')
        .mockReturnValueOnce([
          {
            iso: 'GB',
            iso3: 'GBR',
            names: { en: 'United Kingdom', fr: 'Royaume-Uni' },
            regions: [{ names: { en: 'Scotland', fr: 'Écosse' }, iso: 'SCT' }],
          },
        ]);
    });

    it('should return countries when a region match is found in the text', async () => {
      const text = 'This is a Highland whisky';

      const result = await exploreService['findCountryMatches'](
        text,
        regionCountryMappings,
        filterOptions,
      );

      expect(searchCountrySpy).toHaveBeenCalledWith('Scotland', filterOptions);
      expect(result).toHaveLength(1);
      expect(result[0].iso).toBe('GB');
    });

    it('should return countries when a nationality match is found in the text', async () => {
      const text = 'This is a Scottish whisky';

      const result = await exploreService['findCountryMatches'](
        text,
        regionCountryMappings,
        filterOptions,
      );

      expect(searchCountrySpy).toHaveBeenCalledWith('Scotland', filterOptions);
      expect(result).toHaveLength(1);
      expect(result[0].iso).toBe('GB');
    });

    it('should return countries when a distillery match is found in the text', async () => {
      const text = 'This is a Glenlivet whisky';

      const result = await exploreService['findCountryMatches'](
        text,
        regionCountryMappings,
        filterOptions,
      );

      expect(searchCountrySpy).toHaveBeenCalledWith('Scotland', filterOptions);
      expect(result).toHaveLength(1);
      expect(result[0].iso).toBe('GB');
    });

    it('should return countries when a distillery match and a nationality match (from another country) are found in the text', async () => {
      if (searchCountrySpy) searchCountrySpy.mockReset();

      searchCountrySpy = jest
        .spyOn(countryService as any, 'searchCountriesOrRegions')
        .mockReturnValueOnce([
          {
            iso: 'GB',
            iso3: 'GBR',
            names: { en: 'United Kingdom', fr: 'Royaume-Uni' },
            regions: [{ names: { en: 'Scotland', fr: 'Écosse' }, iso: 'SCT' }],
          },
        ])
        .mockReturnValueOnce([
          {
            iso: 'IE',
            iso3: 'IRL',
            names: { en: 'Ireland', fr: 'Irlande' },
          },
        ]);

      const text = 'This is a Scottish whisky from Bushmills';

      const result = await exploreService['findCountryMatches'](
        text,
        regionCountryMappings,
        filterOptions,
      );

      expect(searchCountrySpy).toHaveBeenCalledWith('Scotland', filterOptions);
      expect(result).toHaveLength(2);
      expect(result[0].iso).toBe('GB');
      expect(result[1].iso).toBe('IE');
    });
  });

  describe('addExplorationLinks', () => {
    beforeEach(() => {
      (exploreService as any).links = [];
      jest
        .spyOn(exploreService as any, 'coloredLog')
        .mockImplementation(() => {});
    });

    it('should add unique links to the internal list', () => {
      const links = [
        {
          asin: 'A1',
          url: 'http://example.com/1',
          explored: false,
          addToExploration: true,
        },
        {
          asin: 'A2',
          url: 'http://example.com/2',
          explored: false,
          addToExploration: true,
        },
      ];

      (exploreService as any).addExplorationLinks(links);
      expect((exploreService as any).links).toHaveLength(2);
      expect((exploreService as any).links.map((l) => l.asin)).toEqual([
        'A1',
        'A2',
      ]);
    });

    it('should ignore links with duplicate ASINs in input array', () => {
      const links = [
        {
          asin: 'A1',
          url: 'http://example.com/1',
          explored: false,
          addToExploration: true,
        },
        {
          asin: 'A1',
          url: 'http://example.com/1-duplicate',
          explored: true,
          addToExploration: true,
        },
      ];

      (exploreService as any).addExplorationLinks(links);
      expect((exploreService as any).links).toHaveLength(1);
      expect((exploreService as any).links[0].asin).toBe('A1');
    });

    it('should ignore links that already exist in the internal list', () => {
      (exploreService as any).links = [
        { asin: 'A1', url: 'http://existing.com', explored: false },
      ];

      const links = [
        {
          asin: 'A1',
          url: 'http://new.com',
          explored: true,
          addToExploration: true,
        },
        {
          asin: 'A2',
          url: 'http://example.com/2',
          explored: false,
          addToExploration: true,
        },
      ];

      (exploreService as any).addExplorationLinks(links);
      expect((exploreService as any).links).toHaveLength(2);
      expect(
        (exploreService as any).links.find((l) => l.asin === 'A1')?.url,
      ).toBe('http://existing.com');
    });

    it('should ignore links without addToExploration flag', () => {
      const links = [
        {
          asin: 'A1',
          url: 'http://example.com/1',
          explored: false,
          addToExploration: false,
        },
        {
          asin: 'A2',
          url: 'http://example.com/2',
          explored: false,
          addToExploration: true,
        },
      ];

      (exploreService as any).addExplorationLinks(links);
      expect((exploreService as any).links).toHaveLength(1);
      expect((exploreService as any).links[0].asin).toBe('A2');
    });

    it('should ignore null and undefined entries in input', () => {
      const links = [
        {
          asin: 'A1',
          url: 'http://example.com/1',
          explored: false,
          addToExploration: true,
        },
        null,
        undefined,
        {
          asin: 'A2',
          url: 'http://example.com/2',
          explored: false,
          addToExploration: true,
        },
      ] as any[];

      (exploreService as any).addExplorationLinks(links);
      expect((exploreService as any).links).toHaveLength(2);
      expect((exploreService as any).links.map((l) => l.asin)).toEqual([
        'A1',
        'A2',
      ]);
    });
  });
});
