import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';

import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';

import { ELogColor, UtilsService } from './utils.service';
import { JsonService } from './json.service';

import { Alcohol } from '../alcohol/entities/alcohol.entity';

type Link = {
  asin?: string;
  url: string;
  explored: number;
  thumbSrc?: string;
  data?: any;
};

@Injectable()
export class ExploreService {
  private links: Link[];
  private page: Page;
  private browser: Browser;
  private cheerioAPI: cheerio.CheerioAPI;
  private websiteExploreHost: string;

  private notTranslatedKeys: string[] = [];

  private alcoholSubject = new Subject<Alcohol>();

  public getAlcoholStream(): Observable<Alcohol> {
    return this.alcoholSubject.asObservable();
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly utilsServcice: UtilsService,
    private readonly jsonService: JsonService,
  ) {
    this.websiteExploreHost = this.configService.get<string>(
      'WEBSITE_EXPLORE_HOST',
    );
  }

  public async start() {
    console.log('ExploreService::start');
    if (!this.websiteExploreHost) {
      console.log('No WEBSITE_EXPLORE_HOST defined!');
      return;
    }

    // Save links data in a json file
    const jsonFileName = `jsons/exploration.json`;
    const explorationData = await this.jsonService.readJsonFile(jsonFileName);
    console.log(explorationData);

    if (!explorationData) {
      await this.jsonService.writeJsonFile(jsonFileName, {
        data: { test: 'value' },
      });
    }
    // TODO: Save links data in jsons

    this.links = [
      {
        asin: 'B07BPLMSMC',
        url: '/dp/B07BPLMSMC',
        explored: null,
      },
      // {
      //   url: '/s?k=whisky',
      //   explored: null,
      // },
      // {
      //   url: '/b/?node=6356912031',
      //   explored: null,
      // },
    ];
    await this.initPuppeteer();
    let nextLink: Link;
    while (this.links.find((link) => link.explored === null)) {
      nextLink = this.links.find((link) => link.explored === null);
      nextLink.data = await this.scraperWebsite(
        `${this.websiteExploreHost}${nextLink.url}`,
      );
      nextLink.explored = Date.now();
      console.log('nextLink:', nextLink);
      console.log(
        'links restants',
        this.links.filter((link) => link.explored === null)?.length,
        '/',
        this.links.length,
      );
      console.log('notTranslatedKeys', this.notTranslatedKeys);

      this.alcoholSubject.next(nextLink.data);

      break;
    }

    await this.browser.close();
  }

  async initPuppeteer() {
    this.browser = await puppeteer.launch();
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    );
  }

  async scraperWebsite(url: string) {
    await this.page.goto(url);
    // ... extraction des données avec Puppeteer ...

    // Récupérer le contenu HTML après le rendu de la page
    const html = await this.page.content();

    // Charger le HTML dans Cheerio
    const $ = cheerio.load(html);
    this.cheerioAPI = $;

    const canonicalLink = $('link[rel="canonical"]').attr('href');
    //console.log('link canonical:', canonicalLink);
    this.utilsServcice.coloredLog(
      ELogColor.FgCyan,
      `link canonical: ${canonicalLink}`,
    );

    if ($('.octopus-page-style').length > 0) {
      $('.octopus-page-style .octopus-pc-item').each(
        this.extractLink.bind(this),
      );
    }

    if ($('#search').length > 0) {
      $('#search [role="listitem"]').each(this.extractLink.bind(this));
      // $('#search .a-carousel-card').each(this.extractLink.bind(this));

      // $('#search .s-pagination-container li').each((i, element) => {
      //   const href = $(element).find('a').attr('href');
      //   console.log('href', href);
      //   if (href) {
      //     this.manageLinkAdding(href);
      //   }
      // });
    }

    if ($('#dp').length > 0) {
      $('#dp .a-carousel-card').each(this.extractLink.bind(this));

      $('#dp .apm-tablemodule-table th').each(
        this.extractLinkFromTable.bind(this),
      );

      console.log('#nav-link-accountList', $(`#nav-link-accountList`).text());

      /*
      const buttonId = 'amzn-ss-get-link-button';
      const shortlinkTextarea = 'amzn-ss-text-shortlink-textarea';
      // Wait for the button to be present in the DOM
      await this.page.waitForSelector(`#${buttonId}`);
      await this.page.click(`#${buttonId}`);
      await this.page.waitForSelector(`#${shortlinkTextarea}`);
      console.log('shortlinkTextarea', $(`#${shortlinkTextarea}`).text());
      */

      const dpClass = $('#dp').attr('class');
      console.log('#dp class', dpClass);
      if (dpClass?.length > 0 && !dpClass.includes('alcoholic_beverage')) {
        console.log('alcoholic_beverage IS NOT IN THE dpClass > RETURN!!!');
        return;
      }
      if (dpClass?.length > 0 && !dpClass.includes('fr_FR')) {
        console.log('fr_FR IS NOT IN THE dpClass > RETURN!!!');
        return;
      }

      if ($('#ppd').length > 0) {
        const breadcrumbs = $('#wayfinding-breadcrumbs_container')
          .text()
          ?.replace(/\s+|\n/g, '')
          .toLowerCase();
        console.log('wayfinding-breadcrumbs:', breadcrumbs);

        if (breadcrumbs?.length > 0 && !breadcrumbs.includes('whiskys')) {
          console.log('whiskys IS NOT IN THE breadcrumbs > RETURN!!!');
          return;
        }

        const metas = {
          title: $('meta[name="title"]').attr('content'),
          description: $('meta[name="description"]').attr('content'),
        };
        let title = $('title').text()?.trim();

        if (metas.title?.length > 0) {
          metas.title = metas.title.split(' : ')[0];
        }
        if (metas.description?.length > 0) {
          metas.description = metas.description.split(' : ')[0];
        }
        if (title?.length > 0) {
          title = title.split(' : ')[0];
        }

        console.log('meta title:', metas.title);
        console.log('meta description:', metas.description);
        console.log('title:', title);

        const productTitle = $('#ppd #productTitle').text()?.trim();
        console.log('productTitle:', productTitle);

        const price = $(
          '#ppd #apex_desktop #subscriptionPrice #sns-base-price .a-price.priceToPay',
        )
          .text()
          ?.trim();
        console.log('Price:', price);

        // console.log(
        //   'vatMessage',
        //   $('#ppd #apex_desktop_snsAccordionRowMiddle #vatMessage_feature_div')
        //     .text()
        //     ?.trim(),
        // );

        //const landingImage = $('#ppd img#landingImage').attr('src');
        //console.log('landingImage src:', landingImage);

        const dynamicImage = JSON.parse(
          $('#ppd img#landingImage').attr('data-a-dynamic-image') || '{}',
        );
        console.log('landingImage dynamicImage:', dynamicImage);

        const thumbnailImage = $('#ppd .imageThumbnail img').attr('src');
        console.log('thumbnailImage src:', thumbnailImage);

        /* ******************************* */

        const tableData = {};
        $('#ppd table.a-normal.a-spacing-micro tbody tr').each((i, row) => {
          const key = $(row).find('td.a-span3 span.a-text-bold').text().trim();
          const value = $(row)
            .find('td.a-span9 span.a-size-base.po-break-word')
            .text()
            .trim();
          if (key) {
            // Vérifier si la clé existe (pour éviter les lignes vides)
            tableData[key] = value;
          }
        });
        //console.log('tableData', tableData);

        const translations = {
          Marque: 'brand',
          "Type d'alcool": 'alcoholType',
          Saveur: 'flavor',
          "Nombre d'unités": 'unitCount',
          "Nombre d'articles": 'numberOfItems',
          'Teneur en alcool': 'alcoholContent',
          'Type de régime': 'dietType',
          'Description du contenu du liquide': 'liquidContentsDescription',
          "Forme de l'article": 'itemForm',
          'Volume liquide': 'liquidVolume',
          "Nombre total d'unités": 'totalUnitCount',
          'Code article international': 'internationalArticleCode',
        };

        const infos = {};

        for (const key in tableData) {
          if (translations.hasOwnProperty(key)) {
            infos[translations[key]] = tableData[key];
          } else {
            // Gérer les clés non traduites (facultatif)
            infos[key] = tableData[key]; // Conserver la clé originale
            console.warn(`Clé non traduite : ${key}`);
            if (!this.notTranslatedKeys.find((val) => val === key)) {
              this.notTranslatedKeys.push(key);
            } else {
              console.log(' > clé déjà présente');
            }
          }
        }

        console.log(infos);

        /* ******************************* */
        const featureBullets: string[] = [];
        $('#ppd #feature-bullets li .a-list-item').each((i, element) => {
          // console.log('feature-bullets', $(element).text());
          featureBullets.push($(element).text()?.trim());
        });
        console.log('feature-bullets:', featureBullets);

        /* ******************************* */

        const productDescription = $('#dp #productDescription').html()?.trim();
        console.log('productDescription:', productDescription);

        /* ******************************* */

        const imagesDescription: string[] = [];
        $(
          '#dp #aplus .desktop .aplus-module-wrapper.aplus-3p-fixed-width img',
        ).each((i, element) => {
          imagesDescription.push($(element).attr('data-src'));
        });
        console.log('images:', imagesDescription);

        return {
          asin: this.extractASIN(canonicalLink),
          canonicalLink,
          timestamp: {
            created: Date.now(),
          },
          metas,
          title,
          productTitle,
          price,
          image: {
            landing: dynamicImage,
            thumbnail: thumbnailImage,
          },
          infos,
          featureBullets,
          description: {
            product: productDescription,
            images: imagesDescription,
          },
        };
      }
    }
  }

  public extractASIN(url: string): string | null {
    try {
      let decodedUrl: string;
      try {
        decodedUrl = decodeURIComponent(url);
      } catch (decodeError) {
        console.error('Erreur de décodage URI :', decodeError);
        return null;
      }

      const match = decodedUrl.match(
        /\/([a-z]{2,}\/){0,2}(dp|gp\/product)\/([A-Z0-9]{10,})/i,
      );
      return match ? match[3] : null; // Retourner seulement l'ASIN (match[3])
    } catch (error) {
      console.error("Erreur lors de l'extraction de l'ASIN :", error);
      return null;
    }
  }

  private manageLinkAdding(href: string, thumbSrc?: string) {
    if (href?.length > 0) {
      if (this.links.find((obj) => obj.url === href)) {
        console.log(href, 'already in links');
      } else {
        const productId = this.extractASIN(href);
        console.log('productId', productId);
        if (!productId && href.startsWith('/vdp/')) {
          this.utilsServcice.coloredLog(
            ELogColor.FgRed,
            'vdp > Lien non ajouté!\n',
          );
          return;
        }
        if (productId && this.links.find((obj) => obj.asin === productId)) {
          this.utilsServcice.coloredLog(ELogColor.FgRed, 'Lien non ajouté!\n');
          return;
        }
        this.utilsServcice.coloredLog(ELogColor.FgGreen, 'Lien ajouté!\n');
        this.links.push({
          asin: productId,
          url: href,
          explored: null,
          thumbSrc,
        });
      }
    }
  }

  private extractLinkFromTable(i: number, element: any): boolean | void {
    const $element = this.cheerioAPI(element);
    // const titre = $element.find('a').text().trim();
    const href = $element.find('a').attr('href');

    const thumbSrc = $element.find('img').attr('src');
    // console.log('extractLinkFromTable titre:', titre);
    console.log('extractLinkFromTable href:', href);
    console.log('extractLinkFromTable thumbSrc:', thumbSrc);
    console.log('');

    this.manageLinkAdding(href, thumbSrc);
  }

  private extractLink(i: number, element: any): boolean | void {
    const $element = this.cheerioAPI(element);
    // const titre = $element.find('.a-link-normal [data-rows]').text().trim();
    let href = $element.find('.a-link-normal').attr('href');

    if (href && href.startsWith('/s?')) {
      const url = new URL(`${this.websiteExploreHost}${href}`);
      const params = new URLSearchParams(url.search);
      if (!params.get('k').includes('whisky')) {
        console.log('k not includes whisky > RETURN\n');
        return;
      }
      href = `/s?k=${encodeURI(params.get('k'))}`;
    }

    if (
      href &&
      href.startsWith('http') &&
      !href.startsWith(this.websiteExploreHost)
    ) {
      console.log('External link > RETURN\n');
      return;
    }

    const thumbSrc = $element.find('.a-link-normal img').attr('src');
    // console.log('extractLink titre:', titre);
    console.log('extractLink href:', href);
    console.log('extractLink thumbSrc:', thumbSrc);
    console.log('');
    //console.log('extractLink this.links', this.links);

    this.manageLinkAdding(href, thumbSrc);
  }
}
