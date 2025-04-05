import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { decode } from 'entities';
import { cancel, confirm, isCancel, select, text } from '@clack/prompts';

import { ELogColor, UtilsService } from '@services/utils.service';
import { JsonService } from '@services/json.service';

import { AlcoholService } from '../alcohol/alcohol.service';
import { CompressService } from '../compress/compress.service';
import {
  EHFModel,
  HuggingFaceService,
} from '../huggingface/huggingface.service';
import {
  Country,
  CountryService,
  FilterOptions,
} from '../country/country.service';
import { PriceItem } from '../alcohol/entities/price.entity';
import { FamilyLink } from '../alcohol/entities/family-link.entity';
import { CreateAlcoholInput } from '../alcohol/entities/create-alcohol-input.entity';
import { Alcohol } from '../alcohol/entities/alcohol.entity';
import { Reviews } from '../alcohol/entities/reviews.entity';
import { Details } from '../alcohol/entities/details.entity';
import {
  CountryInfo,
  RegionInfo,
} from '../alcohol/entities/country-info.entity';

type Link = {
  asin?: string;
  url?: string;
  explored?: number;
  thumbSrc?: string;
  title?: string;
  addToExploration?: boolean;
};

export interface IRegionCountry {
  regions?: string[];
  nationalities: string[];
  whiskyDistilleries: string[];
  brands?: string[];
  country: {
    en: string;
    fr: string;
  };
}

@Injectable()
export class ExploreService implements OnModuleInit {
  private links: Link[];
  private page: Page;
  private browser: Browser;
  private cheerioAPI: cheerio.CheerioAPI;
  private websiteExploreHost: string;
  private countries: IRegionCountry[];
  private jsonCountriesPath = `jsons/countries.json`;

  private targetKeyword = 'whisky';
  private langCountryCode = 'fr_FR';

  private _stopExploration = false;

  public stopExploration(state: boolean): void {
    this._stopExploration = state;
    if (state) {
      this.coloredLog(ELogColor.FgRed, `■ STOP EXPLORATION!`);
    } else {
      this.coloredLog(ELogColor.FgYellow, `START EXPLORATION!`);
    }
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,
    private readonly jsonService: JsonService,
    private readonly alcoholService: AlcoholService,
    private readonly compressService: CompressService,
    private readonly huggingFaceService: HuggingFaceService,
    private readonly countryService: CountryService,
  ) {
    this.websiteExploreHost = this.configService.get<string>(
      'WEBSITE_EXPLORE_HOST',
    );
  }

  onModuleInit() {
    this.start();
  }

  private coloredLog = (color: ELogColor, text: string) =>
    this.utilsService.coloredLog(color, text);

  private coloredText = (color: ELogColor, text: string) =>
    this.utilsService.coloredText(color, text);

  /**
   * Adds unique exploration links to the internal links array.
   * Filters out duplicates based on the ASIN field before adding.
   *
   * @param {Link[]} exploLinks - Array of links to be added.
   */
  private addExplorationLinks(exploLinks: Link[]) {
    const validLinks = exploLinks.filter(
      (link): link is Link =>
        !!link && !this.links.some((existing) => existing.asin === link.asin),
    );

    const filtered = new Map<string, Link>();
    validLinks.forEach((link) => {
      if (!filtered.has(link.asin)) {
        filtered.set(link.asin, link);
      }
    });

    filtered.forEach((link) => this.addExplorationLink(link));
  }

  /**
   * Adds a single link to the internal links array if valid.
   *
   * @param {Link} link - The link to be added.
   */
  private addExplorationLink(link: Link) {
    if (
      link &&
      link.addToExploration &&
      !this.links.some((l) => l.asin === link.asin)
    ) {
      this.coloredLog(ELogColor.FgGreen, `+ Lien ${link.url} ajouté!`);
      const { asin, url, explored } = link;
      this.links.push({ asin, url, explored });
    }
  }

  public async start() {
    await this.utilsService.waitSeconds(1000);
    console.log('★ ExploreService::start');
    if (!this.websiteExploreHost) {
      console.log('No WEBSITE_EXPLORE_HOST defined!');
      return;
    }

    /* **************************************************************************** */

    const countriesData = await this.jsonService.readJsonFile(
      this.jsonCountriesPath,
    );
    if (
      !countriesData ||
      !countriesData.data ||
      countriesData.data.length === 0
    ) {
      this.coloredLog(
        ELogColor.FgRed,
        `No country data found in: ${this.jsonCountriesPath}!`,
      );
      this.stopExploration(true);
      return;
    } else {
      this.countries = countriesData.data;
    }

    /* **************************************************************************** */

    // Get links data from a json file
    const jsonExplorationPath = `jsons/${this.targetKeyword}-exploration.json`;
    const explorationData =
      await this.jsonService.readJsonFile(jsonExplorationPath);

    if (!explorationData) {
      this.links = [
        // {
        //   asin: 'B07BPLMSMC',
        //   url: '/dp/B07BPLMSMC',
        //   explored: null,
        // },
        {
          url: `/s?k=${this.targetKeyword}`,
          explored: null,
        },
      ];

      await this.jsonService.writeJsonFile(jsonExplorationPath, {
        data: this.links,
      });
    } else {
      this.links = explorationData.data;
    }

    /* **************************************************************************** */

    await this.initPuppeteer();

    let nextLink: Link;
    let productData: CreateAlcoholInput;
    let exploredLinks: number;
    let explorationPercent: string;
    let allAsinLinks: number;
    let exploredAsinLinks: number;
    let explorationAsinPercent: string;
    let savedAlcohol: Alcohol;
    while (
      this.links.find((link) => link.explored === null) &&
      !this._stopExploration
    ) {
      nextLink = this.links.find((link) => link.explored === null);

      productData = await this.scraperWebsite(
        `${this.websiteExploreHost}${nextLink.url}`,
      );
      if (productData) {
        try {
          savedAlcohol = await this.alcoholService.create(productData);
        } catch (error) {
          if (error instanceof ConflictException) {
            this.coloredLog(
              ELogColor.FgYellow,
              `✘ Échec de la création du Alcohol : ${error.message}`,
            );
          } else {
            this.coloredLog(
              ELogColor.FgRed,
              `✘ Échec de la création du Alcohol : ${error.message}`,
            );
            this.stopExploration(true);
          }
        }
        if (savedAlcohol) {
          this.coloredLog(ELogColor.FgGreen, `Successfully added to database!`);
          //console.log('savedAlcohol:', savedAlcohol);
        }
      }

      if (this._stopExploration) {
        this.coloredLog(ELogColor.FgRed, `■ break while`);
        break;
      }

      nextLink.explored = Date.now();
      console.log('Updated Link:', nextLink);
      exploredLinks = this.links.filter(
        (link) => link.explored !== null,
      )?.length;
      explorationPercent = this.utilsService.roundPercent(
        exploredLinks,
        this.links.length,
      );
      console.log(
        ' ALL explored links:',
        exploredLinks,
        '/',
        this.links.length,
        '-',
        explorationPercent,
      );

      /* ********************************************************* */
      allAsinLinks = this.links.filter((link) => link.asin?.length > 0)?.length;
      exploredAsinLinks = this.links.filter(
        (link) => link.explored !== null && link.asin?.length > 0,
      )?.length;
      explorationAsinPercent = this.utilsService.roundPercent(
        exploredAsinLinks,
        allAsinLinks,
      );
      console.log(
        'ASIN explored links:',
        exploredAsinLinks,
        '/',
        allAsinLinks,
        '-',
        explorationAsinPercent,
      );

      /* ********************************************************* */

      await this.jsonService.writeJsonFile(jsonExplorationPath, {
        data: this.links,
      });

      /* ********************************************************* */

      const minWaitTime = 2.5 * 60 * 1000; // 2 minutes 30 secondes
      const maxWaitTime = 5.5 * 60 * 1000; // 5 minutes 30 secondes
      const randomWaitTime = Math.floor(
        minWaitTime + Math.random() * (maxWaitTime - minWaitTime),
      );

      this.coloredLog(
        ELogColor.FgCyan,
        `${(randomWaitTime / 1000 / 60).toFixed(2)} minutes left to wait...`,
      );

      await this.utilsService.waitSeconds(3 * 60 * 1000);

      // break;
    }

    await this.browser.close();
  }

  async initPuppeteer() {
    this.browser = await puppeteer.launch({ headless: true });

    // Définir les cookies d'authentification
    const cookieJsonFileName = `jsons/cookie.json`;
    const cookieData = await this.jsonService.readJsonFile(cookieJsonFileName);

    if (cookieData && Object.keys(cookieData).length > 0) {
      cookieData.map((cookie) => {
        if (!cookie.expires) {
          if (cookie.expirationDate) {
            cookie.expires = Number(cookie.expirationDate);
          } else {
            cookie.expires = -1;
          }
          delete cookie.expirationDate;
        }
        delete cookie.hostOnly;
        delete cookie.sameSite;
        delete cookie.storeId;
        delete cookie.id;
        if (!cookie.size) cookie.size = -1;
        return cookie;
      });

      await this.browser.setCookie(...cookieData);
    }

    this.page = await this.browser.newPage();

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64; rv:118.0) Gecko/20100101 Firefox/118.0',
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:118.0) Gecko/20100101 Firefox/118.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/537.36 (KHTML, like Gecko) BraveSoftware/1.16.72 Chrome/117.0.0.0 Safari/537.36',
    ];

    const randomUserAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];
    console.log(
      'Random User-Agent:',
      this.coloredText(ELogColor.FgMagenta, randomUserAgent),
    );

    await this.page.setUserAgent(randomUserAgent);
  }

  async scraperWebsite(url: string) {
    this.coloredLog(ELogColor.FgBlue, `\nurl: ${url}`);
    await this.page.goto(url);
    // ... extraction des données avec Puppeteer ...

    // Récupérer le contenu HTML après le rendu de la page
    const html = await this.page.content();

    // Charger le HTML dans Cheerio
    const $ = cheerio.load(html);
    this.cheerioAPI = $;

    const canonicalLink = $('link[rel="canonical"]').attr('href');
    this.coloredLog(ELogColor.FgCyan, `Canonical link: ${canonicalLink}`);

    if ($('title').text().includes('Page introuvable')) {
      this.coloredLog(ELogColor.FgRed, 'Page introuvable !');
      const answer = await this.showSomeInfosAndPrompt($);
      if (answer === 'stop') {
        this.stopExploration(true);
        return;
      }
      if (answer === 'skip') {
        return;
      }
      if (isCancel(answer)) {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    }

    let link: Link;
    const pageLinks: Link[] = [];

    if ($('#search').length === 0 && $('#dp').length === 0) {
      this.coloredLog(ELogColor.FgRed, `#search and #dp have not been found!`);
      console.log($('#search').length, $('#dp').length);
      const answer = await this.showSomeInfosAndPrompt($);
      if (answer === 'stop') {
        this.stopExploration(true);
        return;
      }
      if (answer === 'skip') {
        return;
      }
      if (isCancel(answer)) {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    }

    // if ($('.octopus-page-style').length > 0) {
    //   $('.octopus-page-style .octopus-pc-item').each((index, element) => {
    //     link = this.extractLink(index, element);
    //     pageLinks.push(link);
    //   });
    // }

    if ($('#search').length > 0) {
      $('#search [role="listitem"]').each((index, element) => {
        link = this.extractLink(index, element);
        pageLinks.push(link);
      });

      $('#search [role="navigation"] .a-list-item').each((index, element) => {
        link = this.extractLink(index, element);
        pageLinks.push(link);
      });

      this.addExplorationLinks(pageLinks);
    }

    if ($('#dp').length > 0) {
      const dpClass = $('#dp').attr('class');
      console.log('#dp class:', this.coloredText(ELogColor.FgYellow, dpClass));
      if (!dpClass || dpClass.length === 0) {
        this.coloredLog(ELogColor.FgRed, 'Empty dpClass!');
        this.stopExploration(true);
        return;
      }
      if (dpClass?.length > 0 && !dpClass.includes('alcoholic_beverage')) {
        this.coloredLog(
          ELogColor.FgRed,
          `'alcoholic_beverage' IS NOT IN THE dpClass`,
        );

        const answer = await this.showSomeInfosAndPrompt($);
        if (answer === 'stop') {
          this.stopExploration(true);
          return;
        }
        if (answer === 'skip') {
          return;
        }
        if (isCancel(answer)) {
          cancel('Operation cancelled.');
          process.exit(0);
        }
      }
      if (dpClass?.length > 0 && !dpClass.includes(this.langCountryCode)) {
        this.coloredLog(
          ELogColor.FgRed,
          `${this.langCountryCode} IS NOT IN THE dpClass > RETURN!!!`,
        );
        return;
      }

      $('#dp .a-carousel-card').each((index, element) => {
        link = this.extractLink(index, element);
        pageLinks.push(link);
      });

      const familyLinks: FamilyLink[] = [];
      $('#dp .apm-tablemodule-table th').each((index, element) => {
        link = this.extractLinkFromTable(index, element);
        pageLinks.push(link);
        if (link && link.asin && link.thumbSrc && link.title) {
          const { asin, thumbSrc, title } = link;
          familyLinks.push({
            asin,
            thumbSrc: this.processImageUrl(thumbSrc, false),
            title,
          });
        }
      });
      console.log('familyLinks:', familyLinks);

      const shortlink = await this.getShortlink($);
      if (!shortlink) {
        this.coloredLog(ELogColor.FgRed, 'Shorlink is undefined!');
        this.stopExploration(true);
        return;
      }

      if ($('#ppd').length > 0) {
        let breadStr = $('#wayfinding-breadcrumbs_feature_div')
          .text()
          ?.replace(/\s+|\n/g, ' ')
          .toLowerCase()
          .trim();

        if (!breadStr) {
          this.coloredLog(ELogColor.FgRed, `breadcrumbs hasn't be found!`);
          this.stopExploration(true);
          return;
        }

        if (
          breadStr?.length > 0 &&
          !breadStr.includes(`${this.targetKeyword}s`)
        ) {
          this.coloredLog(ELogColor.FgRed, `breadcrumbs: ${breadStr}`);
          this.coloredLog(
            ELogColor.FgRed,
            `${this.targetKeyword}s IS NOT IN THE breadcrumbs > RETURN!!!`,
          );

          const answer = await this.showSomeInfosAndPrompt($);
          if (answer === 'stop') {
            this.stopExploration(true);
            return;
          }
          if (answer === 'skip') {
            return;
          }
          if (isCancel(answer)) {
            cancel('Operation cancelled.');
            process.exit(0);
          }

          const newBreadStr = `Epicerie›Bières, vins et spiritueux›Spiritueux›Whiskys`;
          const replaceBreadcrumbs = await confirm({
            message: `Do you want to replace breadcrumbs with '${newBreadStr}'`,
          });
          if (replaceBreadcrumbs) {
            breadStr = newBreadStr.toLowerCase();
          }
        }
        const breadcrumbs = breadStr.split('›').map((bread) => bread.trim());

        if (breadcrumbs[0] !== 'epicerie') {
          this.coloredLog(ELogColor.FgRed, `breadcrumbs[0] !== 'epicerie'`);
          this.stopExploration(true);
          return;
        }

        // Shift (remove) the first element
        breadcrumbs.shift();
        console.log('breadcrumbs:', breadcrumbs);

        /* ********************************************************************************* */

        this.addExplorationLinks(pageLinks);

        /* ********************************************************************************* */

        const metas = {
          title: $('meta[name="title"]').attr('content'),
          description: $('meta[name="description"]').attr('content'),
        };
        let title = $('title').text()?.trim();

        metas.title = this.utilsService.getAllButLast(metas.title, ' : ');

        metas.description = this.utilsService.getAllButLast(
          metas.description,
          ' : ',
        );

        title = this.utilsService.getAllButLast(title, ' : ');

        console.log('meta title:', metas.title);
        console.log('meta description:', metas.description);
        console.log('title:', title);

        const productTitle = $('#ppd #productTitle').text()?.trim();
        console.log(
          'productTitle:',
          this.coloredText(ELogColor.FgYellow, productTitle),
        );

        if (!productTitle) {
          this.coloredLog(ELogColor.FgRed, `Product title is missing!`);
          this.stopExploration(true);
          return;
        }

        /* ********************************************************************************* */

        const avgCustomerReviews = $(
          '#ppd #averageCustomerReviews_feature_div #averageCustomerReviews #acrPopover a i >span',
        )
          .text()
          ?.trim();

        const customerReviewText = $(
          '#ppd #averageCustomerReviews_feature_div #averageCustomerReviews #acrCustomerReviewText',
        )
          .text()
          ?.trim();

        const reviewsStr = `${avgCustomerReviews} (${customerReviewText})`;
        console.log('reviewsStr:', reviewsStr);

        let reviews: Reviews = null;
        if (avgCustomerReviews && customerReviewText) {
          const ratingNumbers = this.utilsService.extractNumbers(reviewsStr);
          if (ratingNumbers.length <= 3) {
            if (ratingNumbers[1] === 5) {
              reviews = {
                rating: ratingNumbers[0],
                ratingCount: ratingNumbers[2],
              };
            } else {
              this.coloredLog(
                ELogColor.FgRed,
                `Reviews extracting numbers problem => ${ratingNumbers[1]} !== 5`,
              );
              this.stopExploration(true);
              return;
            }
          } else {
            this.coloredLog(
              ELogColor.FgRed,
              `Reviews extracting numbers problem => ${ratingNumbers.length} > 3`,
            );
            this.stopExploration(true);
            return;
          }
        }

        /* ********************************************************************************* */

        let newerVersion: FamilyLink;

        if ($('#ppd #newer-version').length > 0) {
          this.coloredLog(ELogColor.FgMagenta, `A newer version exists!`);

          const nvSelector = '#ppd #newer-version';

          const nvText = this.getFirstValidElement(
            $,
            `${nvSelector} .a-link-normal`,
            'text',
          );
          const nvHref = this.getFirstValidElement(
            $,
            `${nvSelector} .a-link-normal`,
            'href',
          );
          const nvImgSrc = this.getFirstValidElement(
            $,
            `${nvSelector} img`,
            'src',
          );

          if (nvText && nvHref && nvImgSrc) {
            newerVersion = {
              asin: this.extractASIN(nvHref),
              title: nvText,
              thumbSrc: this.processImageUrl(nvImgSrc),
            };
          }

          console.log('newerVersion:', newerVersion);
        }

        /* ********************************************************************************* */

        const priceToPayStr = $('#ppd #apex_desktop .a-price.priceToPay')
          .first()
          .text()
          ?.trim();

        const basisPriceStr = $(
          '#ppd #apex_desktop .basisPrice .a-price :first-child',
        )
          .first()
          .text()
          ?.trim();

        const prices: PriceItem[] = [];
        const priceToPay =
          this.utilsService.extractPriceAndCurrency(priceToPayStr);
        const basisPrice =
          this.utilsService.extractPriceAndCurrency(basisPriceStr);

        if (priceToPay || basisPrice) {
          prices.push({
            priceToPay,
            basisPrice,
            timestamp: Date.now(),
          });
        }
        console.log('prices:', prices);

        /* ********************************************************************************* */

        const { images, thumbnails } = await this.getViewerImages($);
        console.log(
          'images    :',
          this.coloredText(ELogColor.FgYellow, images.join(', ')),
        );
        console.log(
          'thumbnails:',
          this.coloredText(ELogColor.FgYellow, thumbnails.join(', ')),
        );

        if (images.length !== thumbnails.length) {
          this.coloredLog(
            ELogColor.FgRed,
            `images and thumbnails have not the same length => ${images.length} !== ${thumbnails.length}`,
          );
          this.stopExploration(true);
          return;
        }

        if (
          images.some((id) => id === null || id === undefined || id === '') ||
          thumbnails.some((id) => id === null || id === undefined || id === '')
        ) {
          this.coloredLog(
            ELogColor.FgRed,
            `At least one id in images or thumbnails is null, undefined or empty!`,
          );
          this.stopExploration(true);
          return;
        }

        /* ******************************* */

        let details: Details[] = [];
        $('#ppd table.a-normal.a-spacing-micro tbody tr').each((i, row) => {
          const legend = $(row)
            .find('td.a-span3 span.a-text-bold')
            .text()
            .trim();
          const value = $(row)
            .find('td.a-span9 span.a-size-base.po-break-word')
            .text()
            .trim();
          if (legend && value) {
            details.push({
              legend,
              value,
            });
          }
        });

        /* ******************************* */
        const featureBullets: string[] = [];
        $('#ppd #feature-bullets li .a-list-item').each((i, element) => {
          featureBullets.push($(element).text()?.trim());
        });
        console.log('feature-bullets:', featureBullets);

        /* ******************************* */

        $('#dp #productDetails_techSpec_section_1 tbody tr').each((i, row) => {
          const legend = $(row).find('th').text().trim();
          const value = $(row).find('td').text().trim();
          if (legend && value) {
            details.push({
              legend,
              value,
            });
          }
        });

        /* ******************************* */

        $('#dp #detailBullets_feature_div li').each((i, element) => {
          const $element = this.cheerioAPI(element);
          const elValue = $element
            .text()
            ?.replace(/\s+|\n/g, ' ')
            ?.trim();
          const splitElVal = elValue.split(':');
          if (splitElVal.length === 2) {
            if (
              splitElVal[0].includes('Fabricant') ||
              splitElVal[0].includes('Pays') ||
              splitElVal[0].includes('Région')
            ) {
              details.push({
                legend: splitElVal[0].trim(),
                value: splitElVal[1].trim(),
              });
              console.log(
                '+ push in details:',
                splitElVal[0].trim(),
                '/',
                splitElVal[1].trim(),
              );
            }
          }
        });

        // Supprimer tous les caractères U+200E (LRM) et U+200F (RLM)
        details = details.map((d) => ({
          legend: d.legend.replace(/[\u200E\u200F]/g, '').trim(),
          value: d.value.replace(/[\u200E\u200F]/g, '').trim(),
        }));

        details = this.utilsService.removeDuplicates(
          details,
          (item) => `${item.legend}-${item.value}`,
        );

        console.log('details:', details);

        /* ******************************* */

        let productDescription = $('#dp #productDescription').html()?.trim();
        productDescription = this.optimizeHtml(productDescription);
        console.log('productDescription:', productDescription);

        const textDescription =
          productDescription !== null
            ? cheerio
                .load(productDescription)
                .text()
                ?.replace(/\s+/g, ' ')
                ?.trim()
            : null;

        if (
          this.extractCleanText($('#dp #productDescription').html()) !==
          textDescription
        ) {
          this.coloredLog(
            ELogColor.FgRed,
            `The descriptions have different texts!`,
          );
          this.stopExploration(true);
          return;
        }

        /* ******************************* */

        let imagesDescription: string[] = [];
        let imgDescSrc: string;
        $('#dp #aplus .desktop .aplus-module')
          .not('.aplus-brand-story-hero')
          .each((i, element) => {
            imgDescSrc = $(element).find('img').attr('data-src');
            if (imgDescSrc) imagesDescription.push(imgDescSrc);
          });

        imagesDescription = imagesDescription.map((url) =>
          this.processImageUrl(url),
        );
        console.log('imagesDescription:', imagesDescription);

        if (
          imagesDescription.some(
            (id) => id === null || id === undefined || id === '',
          )
        ) {
          this.coloredLog(
            ELogColor.FgRed,
            `At least one element in imagesDescription is null, undefined or empty!`,
          );
          this.stopExploration(true);
          return;
        }

        /* ******************************* */

        let descriptionCompressed: string;
        let descDecompressedText: string;
        let cocktail: boolean;

        if ($('#dp #aplus').length > 0) {
          let concatFullDesc = '';
          $('#dp #aplus').each((index, element) => {
            console.log(
              '#dp #aplus /',
              index,
              '====>',
              $(element).html().length,
            );
            concatFullDesc += $(element).html();
          });
          console.log('concatFullDesc.length:', concatFullDesc.length);

          const extractedCSSAndHTML = this.extractCSSAndHTML(concatFullDesc);

          const cleanDescHTML = this.removeScriptsAndComments(
            extractedCSSAndHTML.html,
          );

          if (!cleanDescHTML) {
            this.coloredLog(ELogColor.FgRed, `HTML extraction empty!`);
            this.stopExploration(true);
            return;
          }

          cocktail = cleanDescHTML.includes('cocktail');
          if (cocktail) {
            this.coloredLog(ELogColor.FgYellow, 'Speak about cocktail!');
          }

          descriptionCompressed =
            await this.compressService.compress(cleanDescHTML);

          // Check if decompression works
          const descriptionDecompressed = await this.compressService.decompress(
            descriptionCompressed,
          );
          if (descriptionDecompressed !== cleanDescHTML) {
            this.coloredLog(ELogColor.FgRed, `Compression problem!`);
            this.stopExploration(true);
            return;
          }

          descDecompressedText = cheerio.load(descriptionDecompressed).text();

          console.log(
            'manufacturerDescription decompressed text:',
            descDecompressedText,
          );

          if (!descDecompressedText) {
            this.coloredLog(ELogColor.FgRed, `Uncompressed text empty!`);
            this.stopExploration(true);
            return;
          }
        }

        /* ****************************** DEFINE COUNTRY ************************************* */

        // const country = await this.extractCountry(
        //   productTitle,
        //   details,
        //   textDescription,
        //   descDecompressedText,
        // );

        const country = await this.discoverCountry({
          name: productTitle,
          asin: this.extractASIN(canonicalLink),
          details,
          description: {
            product: productDescription,
            manufacturer: descriptionCompressed,
          },
        });

        if (!country) {
          this.coloredLog(ELogColor.FgRed, `country is undefined!`);
          this.stopExploration(true);
          return;
        }

        await this.utilsService.waitSeconds(3000);

        /* ******************************************* */

        const finalAlcohol: CreateAlcoholInput = {
          asin: this.extractASIN(canonicalLink),
          // canonicalLink,
          // metas,
          // title,
          name: productTitle,
          breadcrumbs,
          reviews,
          prices,
          images: {
            bigs: images,
            thumbnails,
          },
          details,
          features: featureBullets,
          description: {
            product: productDescription,
            images: imagesDescription,
            manufacturer: descriptionCompressed,
          },
          familyLinks,
          shortlink,
          type: this.targetKeyword,
          langCode: this.langCountryCode,
          newerVersion,
          country,
        };

        if (cocktail) {
          finalAlcohol.description.cocktail = true;
        }

        return finalAlcohol;
      }
    }
  }

  private async enterCountryName() {
    let country: CountryInfo;
    const countryNameText = await text({
      message: 'Enter a country or region name:',
    });
    if (isCancel(countryNameText)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    const filterOptions: FilterOptions = {
      exact: true,
      keepKeys: [
        'iso',
        'iso3',
        'names.fr',
        'names.en',
        'regions.iso',
        'regions.names.fr',
        'regions.names.en',
      ],
      keepOnlyMatchingRegions: true,
    };
    const foundCountries = await this.countryService.searchCountriesOrRegions(
      countryNameText.trim(),
      filterOptions,
    );
    console.log('foundCountries:', foundCountries);

    if (foundCountries.length > 0) {
      country = await this.selectCountry(foundCountries);
    }

    return country;
  }

  private async discoverCountry(alcohol: {
    name: string;
    asin: string;
    details: any[];
    description: { product: string; manufacturer?: string };
  }) {
    const brandName = alcohol.details.find((detail) =>
      detail.legend.toLowerCase().includes('marque'),
    )?.value;
    const countryName = alcohol.details.find(
      (detail) =>
        detail.legend.toLowerCase().includes('pays') ||
        detail.legend.toLowerCase().includes('country'),
    )?.value;
    const regionName = alcohol.details.find(
      (detail) =>
        detail.legend.toLowerCase().includes('région') ||
        detail.legend.toLowerCase().includes('region'),
    )?.value;
    const asinLog = this.coloredText(ELogColor.FgYellow, alcohol.asin);
    const brandNameLog = brandName
      ? brandName
      : this.coloredText(ELogColor.FgRed, brandName);
    const countryNameLog = countryName
      ? countryName
      : this.coloredText(ELogColor.FgRed, countryName);
    const regionNameLog = regionName
      ? regionName
      : this.coloredText(ELogColor.FgRed, regionName);
    console.log(
      `\n${asinLog} : ${brandNameLog} / ${countryNameLog} / ${regionNameLog}`,
    );

    let country = await this.extractCountry(
      alcohol.name,
      alcohol.details,
      alcohol.description.product,
      alcohol.description.manufacturer,
    );
    console.log(country);

    if (!country) {
      country = await this.enterCountryName();
    }

    if (country?.regions?.length > 1) {
      this.coloredLog(ELogColor.FgRed, 'Several regions are found!');
      // TODO: Maybe choose a region
      return null;
    }

    const fullCountry = this.utilsService.deepCloneJSON(country);

    if (country?.regions?.length === 1) {
      country = country?.regions[0] as CountryInfo;
    }

    if (country) {
      const foundCountryInJson = this.countries.some((jsonCountry) => {
        return (
          jsonCountry.country.en
            .toLowerCase()
            .trim()
            .includes(country.names.en.toLowerCase().trim()) ||
          jsonCountry.country.fr
            .toLowerCase()
            .trim()
            .includes(country.names.fr.toLowerCase().trim())
        );
      });

      if (!foundCountryInJson) {
        const saveConfirmation = await confirm({
          message: `Save the new country "${country.names.en}" in json?`,
        });
        if (isCancel(saveConfirmation)) {
          cancel('Operation cancelled.');
          process.exit(0);
        }
        if (saveConfirmation) {
          this.countries.push({
            nationalities: [],
            country: {
              en: country.names.en,
              fr: country.names.fr,
            },
            whiskyDistilleries: [],
            brands: [brandName.trim()],
          });

          await this.jsonService.writeJsonFile(this.jsonCountriesPath, {
            data: this.countries,
          });
        } else {
          // return null;
        }
      }

      const foundBrandInJson = this.countries.some((jsonCountry) => {
        return jsonCountry.brands?.some((brand) => {
          return brand
            .toLowerCase()
            .trim()
            ?.includes(brandName.toLowerCase().trim());
        });
      });

      if (!foundBrandInJson) {
        const saveConfirmation = await confirm({
          message: `Save the brand name "${brandName}" for "${country.names.en}" in json?`,
        });
        if (isCancel(saveConfirmation)) {
          cancel('Operation cancelled.');
          process.exit(0);
        }
        if (saveConfirmation) {
          this.countries = this.countries.map((jsonCountry) => {
            if (
              jsonCountry.country.en.toLowerCase() ===
                country.names.en.toLowerCase() ||
              jsonCountry.country.fr.toLowerCase() ===
                country.names.fr.toLowerCase()
            ) {
              if (!jsonCountry.brands) {
                jsonCountry.brands = [];
              }
              jsonCountry.brands.push(brandName.trim());
            }
            return jsonCountry;
          });

          await this.jsonService.writeJsonFile(this.jsonCountriesPath, {
            data: this.countries,
          });

          await this.utilsService.waitSeconds(4000);
        } else {
          console.log('\nChoose a country to return');
          return await this.enterCountryName();
        }
      }
    }

    return fullCountry;
  }

  private async extractCountry(
    productTitle: string,
    details: Details[],
    textDescription: string,
    descDecompressedText: string,
  ): Promise<CountryInfo> {
    // INFO: In english, country could be "American"...
    // INFO: Region could be "Kentucky"...
    const detailKeywords = ['pays', 'country', 'région', 'region'];
    const keptDetails = details.filter((detail) =>
      detailKeywords.some((keyword) =>
        detail.legend.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    keptDetails.forEach((detail) =>
      console.log(`${detail.legend}: ${detail.value}`),
    );

    const filterOptions: FilterOptions = {
      exact: true,
      keepKeys: [
        'iso',
        'iso3',
        'names.fr',
        'names.en',
        'regions.iso',
        'regions.names.fr',
        'regions.names.en',
      ],
      keepOnlyMatchingRegions: true,
    };

    let foundCountries: Country[];
    let finalCountry: CountryInfo;

    /* ******************************* STEP 0 : LOOK IN DETAILS - BRAND AND COUNTRY *********************************/

    const brandDetail = details.find((detail) =>
      ['marque', 'brand'].some((keyword) =>
        detail.legend.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );
    console.log(`Marque/Brand: ${brandDetail?.value}`);
    if (brandDetail?.value?.length > 1) {
      foundCountries = await this.findCountryMatches(
        brandDetail?.value,
        this.countries,
        filterOptions,
      );

      if (foundCountries.length > 1) {
        this.coloredLog(
          ELogColor.FgRed,
          'Several countries have been found with the brand!',
        );

        foundCountries = foundCountries.filter((country) => {
          return keptDetails.some((detail) => {
            return (
              detail.value.toLowerCase().trim() ===
                country.names.en.toLowerCase() ||
              detail.value.toLowerCase().trim() ===
                country.names.fr.toLowerCase()
            );
          });
        });
      }

      if (foundCountries.length === 0) {
        this.coloredLog(
          ELogColor.FgRed,
          'No country found with brand (after filtering)!',
        );
      } else if (foundCountries.length > 1) {
        this.coloredLog(
          ELogColor.FgRed,
          'Several countries have been found with the brand!',
        );
        finalCountry = await this.selectCountry(foundCountries);
        if (finalCountry) {
          return finalCountry;
        }
      } else if (foundCountries.length === 1) {
        return this.transformCountryToCountryInfo(foundCountries[0]);
      }
    }

    /* ******************************* STEP 1 : LOOK IN DETAILS *********************************/

    if (keptDetails.length > 0) {
      foundCountries = await this.countryService.searchCountriesOrRegions(
        keptDetails.map((d) => d.value).join(' '),
        { ...filterOptions, ...{ searchInText: true } },
      );

      finalCountry = await this.selectCountry(foundCountries);
      if (finalCountry) {
        return finalCountry;
      }
    }

    this.coloredLog(ELogColor.FgRed, 'No country data found in details!');

    /* ******************************* STEP 2 : LOOK IN THE TITLE *********************************/

    foundCountries = await this.countryService.searchCountriesOrRegions(
      productTitle,
      { ...filterOptions, ...{ searchInText: true } },
    );

    finalCountry = await this.selectCountry(foundCountries);
    if (finalCountry) {
      return finalCountry;
    }

    this.coloredLog(ELogColor.FgRed, 'No country data found in title!');

    /* ******************************* STEP 3 : LOOK IN THE TITLE (WITH MATCHING) *********************************/

    foundCountries = await this.findCountryMatches(
      `${productTitle}`, //  ${textDescription}
      this.countries,
      filterOptions,
    );

    finalCountry = await this.selectCountry(foundCountries);
    if (finalCountry) {
      return finalCountry;
    }

    this.coloredLog(
      ELogColor.FgRed,
      'No country data found in title (with mapping)!',
    );

    /* ******************************* STEP 4 : MISTRAL AI *********************************/

    if (!finalCountry) {
      /* ****************************** MISTRAL AI ************************************** */
      // Donne aussi le drapeau (flag) en "Emoji Unicode", tel que {"flag": "🇺🇸"}, la valeur doit comporter uniquement des caractères unicode.
      // N'oublie pas de prendre en considération les sous régions, comme les états américains, le Code ISO 3166-2 (sub) pour le Tennessee est : US-TN. Pour la Grande-Bretagne, le Code ISO 3166-2 (sub) pour le l'Écosse est : GB-SCT.
      const prompt = `Guess what is the manufacturer country (distillery) about this product : title: "${productTitle}", description 1: "${textDescription}", description 2: "${descDecompressedText}". Give me the country name in english and french with the code alpha2 and alpha3 (ISO 3166-1), et si il y a une sous région, peux tu aussi donner le code comme SCT pour Scotland (ISO 3166-2).
      Donne moi les infos sous forme d'objet json, uniquement les infos de pays sous forme {"iso":"GB","iso3":"GBR","names":{"en":"United Kingdom","fr":"Royaume-Uni"},"regions":[{"names":{"en":"Scotland","fr":"Écosse"},"iso":"SCT"}]}, autres exemples : {"iso":"GB","iso3":"GBR","names":{"en":"United Kingdom","fr":"Royaume-Uni"},"regions":[{"names":{"en":"Wales","fr":"Pays de Galles"},"iso":"WLS"}]} ou {"iso":"US","iso3":"USA","names":{"en":"United States","fr":"États-Unis"},"regions":[{"names":{"en":"Kentucky","fr":"Kentucky"},"iso":"KY"}]} ou {"names": {"en": "Japan", "fr": "Japon"}, "iso": "JP", "iso3": "JPN"}, précise absolument le résultat de cette manière : \`\`\`json {} \`\`\`. L'ouverture et la fermeture doivent absolument comporter trois apostrophes comme \`\`\`.
      Le "regions" est optionnel.`;
      const mistralResult = await this.huggingFaceService.analyzeText(
        prompt,
        EHFModel.MISTRAL,
      );
      const generatedText = mistralResult[0]?.generated_text;
      const optimizedAnswerText = generatedText.replace(prompt, '');
      const mistralCountries: CountryInfo[] =
        this.huggingFaceService.extractCodeBlocks(optimizedAnswerText);
      console.log('mistralCountries?.length:', mistralCountries?.length);
      finalCountry = mistralCountries.find(
        (country) => Object.keys(country).length > 0,
      );

      console.log('country (Mistral AI):', finalCountry);

      if (finalCountry) {
        if (finalCountry.regions && finalCountry.regions.length === 0) {
          delete finalCountry.regions;
        }

        const mistralCountrySaveConfirmation = await confirm({
          message: `Are you sure you want to save this country's data?`,
        });
        if (!mistralCountrySaveConfirmation) {
          return;
        }
      } else {
        console.log('mistralResult:', generatedText);
        this.coloredLog(ELogColor.FgRed, `Mistral country is null!`);
        return;
      }
    }

    return finalCountry;
  }

  private async findCountryMatches(
    text: string,
    regionCountryMappings: IRegionCountry[],
    filterOptions: FilterOptions,
  ): Promise<Country[]> {
    const textLower = text.toLowerCase();
    let foundCountries: Country[] = [];
    let countries: Country[];

    let regionMatchFound: boolean;
    let nationalityMatchFound: boolean;
    let distilleryMatchFound: boolean;
    let brandsMatchFound: boolean;
    for (const mapping of regionCountryMappings) {
      regionMatchFound = mapping.regions?.some((region) =>
        textLower.includes(region.toLowerCase()),
      );
      nationalityMatchFound = mapping.nationalities?.some((nationality) =>
        textLower.includes(nationality.toLowerCase()),
      );
      distilleryMatchFound = mapping.whiskyDistilleries?.some((distillery) =>
        textLower.includes(distillery.toLowerCase()),
      );
      brandsMatchFound = mapping.brands?.some((brand) =>
        textLower.includes(brand.toLowerCase()),
      );

      if (
        regionMatchFound ||
        nationalityMatchFound ||
        distilleryMatchFound ||
        brandsMatchFound
      ) {
        mapping.regions?.some((region) => {
          if (textLower.includes(region.toLowerCase())) {
            console.log(' regions:', textLower, '=>', region.toLowerCase());
          }
        });
        mapping.nationalities?.some((nationality) => {
          if (textLower.includes(nationality.toLowerCase())) {
            console.log(
              ' nationalities:',
              textLower,
              '=>',
              nationality.toLowerCase(),
            );
          }
        });
        mapping.whiskyDistilleries?.some((distillery) => {
          if (textLower.includes(distillery.toLowerCase())) {
            console.log(
              ' distilleries:',
              textLower,
              '=>',
              distillery.toLowerCase(),
            );
          }
        });
        mapping.brands?.some((brand) => {
          if (textLower.includes(brand.toLowerCase())) {
            console.log(' brands:', textLower, '=>', brand.toLowerCase());
          }
        });

        countries = await this.countryService.searchCountriesOrRegions(
          mapping.country.en,
          filterOptions,
        );
        foundCountries = [...foundCountries, ...countries];
      }
    }

    return foundCountries;
  }

  private transformCountryToCountryInfo(country: Country): CountryInfo {
    if (!country) {
      return null;
    }

    const countryInfo = new CountryInfo();

    countryInfo.names = { ...country.names } as any;
    countryInfo.iso = country.iso;
    countryInfo.iso3 = country.iso3;

    if (country.regions) {
      countryInfo.regions = country.regions.map((region) => {
        const regionInfo = new RegionInfo();

        regionInfo.names = { ...region.names } as any;
        regionInfo.iso = region.iso;

        return regionInfo;
      });
    }

    return countryInfo;
  }

  private async selectCountry(
    mergedCountries: Country[],
  ): Promise<CountryInfo> {
    let selectedCountry: Country;
    if (mergedCountries?.length === 1) {
      selectedCountry = mergedCountries[0];
    } else if (mergedCountries?.length > 1) {
      const countryOptions = mergedCountries.map((country) => ({
        value: country,
        label: `${country.names.en} (${country.iso})${country.regions?.length === 1 ? ' / ' + country.regions[0].names.en : ' / (' + (country.regions?.length || 0) + ' region(s))'}`,
      }));
      const selectResult = await select({
        message: 'Select a country/region ?',
        options: countryOptions,
      });
      if (typeof selectResult === 'symbol') {
        console.log('> symbol result:', selectResult);
      } else {
        selectedCountry = selectResult;
      }
    }

    return this.transformCountryToCountryInfo(selectedCountry);
  }

  private processImageUrl(url: string, withParams = true): string {
    try {
      const id = this.extractImageIdFromUrl(url);
      let params: string;
      if (withParams) {
        params = this.extractImageParamsFromUrl(url);
      }

      if (!id) {
        console.error(`URL invalide: ${url}`);
        return null;
      }

      if (id && !params) {
        return `${id}`;
      }

      return `${id}.${params}`;
    } catch (error) {
      console.error(`Erreur lors du traitement de l'URL ${url}:`, error);
      return null;
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

  private manageLinkAdding(
    href: string,
    thumbSrc?: string,
    title?: string,
  ): Link {
    let addToExploration = true;
    if (href?.length > 0) {
      if (this.links.find((obj) => obj.url === href)) {
        this.coloredLog(ELogColor.FgRed, 'url already in links');
        addToExploration = false;
      }
      const productId = this.extractASIN(href);
      console.log('asin:', productId);
      if (!productId && href.startsWith('/vdp/')) {
        this.coloredLog(ELogColor.FgRed, 'vdp => Lien non ajouté!');
        addToExploration = false;
        return;
      }
      if (productId && this.links.find((obj) => obj.asin === productId)) {
        this.coloredLog(
          ELogColor.FgRed,
          'ASIN already in links => Lien non ajouté!',
        );
        addToExploration = false;
      }
      if (productId) {
        href = `/dp/${productId}`;
      }

      return {
        asin: productId,
        url: href,
        explored: null,
        title,
        thumbSrc,
        addToExploration,
      };
    }
  }

  private extractLinkFromTable(i: number, element: any): Link {
    const $element = this.cheerioAPI(element);
    const title = $element.find('a').text().trim();
    const href = $element.find('a').attr('href');
    const thumbSrc = $element.find('img').attr('src');
    // console.log('♦ extractLinkFromTable title:', title);
    // console.log('♦ extractLinkFromTable href:', href);
    // console.log('♦ extractLinkFromTable thumbSrc:', thumbSrc);

    return this.manageLinkAdding(href, thumbSrc, title);
  }

  private extractLink(i: number, element: any): Link {
    const $element = this.cheerioAPI(element);
    // const titre = $element.find('.a-link-normal [data-rows]').text().trim();
    let href = $element.find('.a-link-normal').attr('href');
    href = href ? href : $element.find('.s-pagination-item').attr('href');

    if (href && href.startsWith('/s?')) {
      const url = new URL(`${this.websiteExploreHost}${href}`);
      const params = new URLSearchParams(url.search);
      if (!params.get('k').includes(this.targetKeyword)) {
        this.coloredLog(
          ELogColor.FgRed,
          `${params.get('k')} > k not includes ${this.targetKeyword} > RETURN`,
        );
        return;
      }
      href = `/s?k=${encodeURI(params.get('k'))}`;
      if (params.get('page')) {
        href = `${href}&page=${encodeURI(params.get('page'))}`;
      }
    }

    if (
      href &&
      href.startsWith('http') &&
      !href.startsWith(this.websiteExploreHost)
    ) {
      this.coloredLog(ELogColor.FgRed, 'External link > RETURN');
      return;
    }

    const thumbSrc = $element.find('.a-link-normal img').attr('src');

    // const thumbDynamicImage = JSON.parse(
    //   $element.find('.a-link-normal img').attr('data-a-dynamic-image') || '{}',
    // );

    // console.log('♦ extractLink titre:', titre);
    // console.log('♦ extractLink href:', href);
    // console.log('♦ extractLink thumbSrc:', thumbSrc);

    return this.manageLinkAdding(href, thumbSrc);
  }

  private async getViewerImages($: cheerio.CheerioAPI) {
    const thumbnails: string[] = [];
    $('#ppd #altImages .imageThumbnail').each((i, row) => {
      //console.log('thumbnailImage src:', $(row).find('img').attr('src'));

      thumbnails.push($(row).find('img').attr('src'));
    });

    const thumbnailEls = await this.page.$$('#ppd .imageThumbnail');

    for (const thumbnail of thumbnailEls) {
      try {
        const boundingBox = await this.page.evaluate((el) => {
          if (el) {
            const rect = el.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
          } else {
            return null;
          }
        }, thumbnail);

        if (boundingBox) {
          await this.page.mouse.move(boundingBox.x, boundingBox.y);

          await this.page.evaluate((scrollAmount) => {
            window.scrollBy(0, scrollAmount);
          }, 60);

          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          console.error(
            'Could not get bounding box for a thumbnail (element not found).',
          );
        }
      } catch (innerError) {
        console.error('Error during hover:', innerError);
      }
    }

    // Récupérer le contenu HTML mis à jour
    const htmlUpdated = await this.page.content();
    $ = cheerio.load(htmlUpdated);

    const images: string[] = [];
    $('#ppd #main-image-container img.a-dynamic-image').each((i, row) => {
      //console.log('mainImage src:', $(row).attr('src'));
      images.push($(row).attr('src'));
    });

    return {
      images: images.map((url) => this.extractImageIdFromUrl(url)),
      thumbnails: thumbnails.map((url) => this.extractImageIdFromUrl(url)),
    };
  }

  private extractImageIdFromUrl(url: string): string {
    const match = url.match(
      /([a-zA-Z0-9-_+]+)\.[a-zA-Z0-9_,]*\.?[a-zA-Z]{3,4}$/,
    );
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }

  private extractImageParamsFromUrl(url: string): string {
    const match = url.match(
      /[a-zA-Z0-9-_+]+\.([a-zA-Z0-9_,]*)\.?[a-zA-Z]{3,4}$/,
    );
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }

  private async getShortlink($: cheerio.CheerioAPI): Promise<string> {
    let shortlink: string;
    this.coloredLog(ELogColor.FgMagenta, '\nGET SHORTLINK');
    console.log('#nav-link-accountList', $(`#nav-link-accountList`).text());
    if ($(`#nav-link-accountList`).text().includes('Identifiez-vous')) {
      this.coloredLog(ELogColor.FgRed, 'Not logged!');
      this.stopExploration(true);
      return;
    } else {
      const buttonId = 'amzn-ss-get-link-button';
      const dropdownId = 'amzn-ss-tracking-id-dropdown-text';
      const selectTargetKey = `alcoholwhiskies-21`;
      const getLinkButtonId = 'amzn-ss-get-link-btn-text-announce';
      const shortlinkTextarea = 'amzn-ss-text-shortlink-textarea';

      console.log(
        'category:',
        $('.amzn-ss-category .amzn-ss-content').text()?.trim(),
      );
      console.log(
        'commission-rate:',
        $('.amzn-ss-commission-rate .amzn-ss-content').text()?.trim(),
      );

      await this.page.click(`#${buttonId}`);
      await this.utilsService.waitSeconds(2000);
      await this.page.select(`#${dropdownId}`, selectTargetKey);
      await this.utilsService.waitSeconds(2000);

      const trackingSelectValue = $(`#${dropdownId}`).val();
      console.log('trackingSelectValue:', trackingSelectValue);

      if (trackingSelectValue !== selectTargetKey) {
        this.coloredLog(
          ELogColor.FgRed,
          `Problem => trackingSelectValue is ${trackingSelectValue}`,
        );
        this.stopExploration(true);
        return;
      }

      await this.page.click(`#${getLinkButtonId}`);
      await this.utilsService.waitSeconds(2000);

      shortlink = await this.page.evaluate((sel) => {
        const textarea = document.querySelector(sel) as HTMLTextAreaElement;
        return textarea ? textarea.value : null;
      }, `#${shortlinkTextarea}`);
      console.log(
        'shortlink:',
        this.coloredText(ELogColor.FgYellow, shortlink),
        '\n',
      );
    }
    return shortlink;
  }

  public optimizeHtml(html: string): string {
    if (!html) {
      return null;
    }

    let $ = cheerio.load(html, { xml: false }, false);

    // Supprimer les balises inutiles
    $(
      'script, a, style, iframe, noscript, base, link[rel="stylesheet"]',
    ).remove();

    // Supprimer les commentaires
    $ = this.removeHtmlComments($);

    // Sélectionner et supprimer tous les éléments ayant `display: none`
    // $('[style]').each((_, el) => {
    //   const style = $(el).attr('style') || '';
    //   if (/display\s*:\s*none/i.test(style)) {
    //     $(el).remove();
    //   }
    // });

    // Supprimer les balises vides (sauf exceptions)
    $('*:empty').not('img, br, meta, link').remove();

    $('span.a-text-bold').each(function () {
      $(this).replaceWith(`<strong>${$(this).html()}</strong>`);
    });

    // Sélectionner tous les éléments ayant un attribut commençant par "data-"
    $.root()
      .find('*')
      .each((_, element) => {
        const el = $(element);
        Object.keys(el.attr() || {}).forEach((attr) => {
          if (attr.startsWith('data-')) {
            el.removeAttr(attr);
          }
        });
      });

    // Nettoyer les attributs inutiles
    $('[style], [class], [onclick], [onmouseover]').removeAttr(
      'style class onclick onmouseover',
    );

    // Supprimer les liens <a> sans href
    // $('a:not([href]), a[href=""]').remove();

    let htmlContent = $.html().replace(/\s+/g, ' ').trim();

    // Remplacer les balises mal fermées </br> par un remplacement propre
    // htmlContent = htmlContent.replace(/<\/br>/g, '');

    // Décoder les entités HTML pour garder les caractères spéciaux sous leur forme réelle
    htmlContent = decode(htmlContent);

    return htmlContent;
  }

  public removeHtmlComments($: cheerio.CheerioAPI): cheerio.CheerioAPI {
    $.root()
      .contents()
      .filter(function () {
        return this.type === 'comment';
      })
      .remove();

    $.root()
      .find('*')
      .contents()
      .filter(function () {
        return this.type === 'comment';
      })
      .remove();

    return $;
  }

  public removeScriptsAndComments(html: string): string {
    if (!html) {
      return null;
    }

    let $ = cheerio.load(html, { xml: false }, false);

    $(
      'hr, script, iframe, base, link[rel="stylesheet"], input[type="hidden"], .apm-tablemodule-atc',
    ).remove();

    // Supprimer les commentaires
    $ = this.removeHtmlComments($);

    $ = this.clearHrefQueryString($);

    // Sélectionner et supprimer tous les éléments ayant `display: none`
    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      if (/display\s*:\s*none/i.test(style)) {
        $(el).remove();
      }
    });

    // $('span.a-text-bold').each(function () {
    //   $(this).replaceWith(`<strong>${$(this).html()}</strong>`);
    // });

    // Sélectionner tous les éléments ayant un attribut commençant par "data-" sauf "data-src" et "data-a-dynamic-image"
    $.root()
      .find('*')
      .each((_, element) => {
        const el = $(element);
        Object.keys(el.attr() || {}).forEach((attr) => {
          if (attr.startsWith('data-')) {
            if (attr !== 'data-src' && attr !== 'data-a-dynamic-image') {
              el.removeAttr(attr);
            }
          }
        });
      });

    // Nettoyer les attributs inutiles
    $('[onclick], [onmouseover], [cel_widget_id]').removeAttr(
      'onclick onmouseover cel_widget_id',
    );

    let htmlContent = $.html().replace(/\s+/g, ' ').trim();

    // Remplacer les balises mal fermées </br> par un remplacement propre
    // htmlContent = htmlContent.replace(/<\/br>/g, '');

    // Décoder les entités HTML pour garder les caractères spéciaux sous leur forme réelle
    htmlContent = decode(htmlContent);

    return htmlContent;
  }

  public clearHrefQueryString($: cheerio.CheerioAPI): cheerio.CheerioAPI {
    $('a[href]').each((index, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      if (href) {
        const indexQuestionMark = href.indexOf('?');
        if (indexQuestionMark !== -1) {
          $element.attr('href', href.substring(0, indexQuestionMark));
        }
      }
    });
    return $;
  }

  /**
   * Extracts CSS styles and cleans the HTML by removing <style> tags.
   *
   * @param {string} htmlString - The HTML string containing embedded styles.
   * @returns {{ css: string[], html: string }} - An object containing an array of CSS rules and the cleaned HTML.
   */
  public extractCSSAndHTML(htmlString: string): {
    css: string[];
    html: string;
  } {
    const $ = cheerio.load(htmlString);

    const cssArray: string[] = [];

    $('style').each((_, element) => {
      cssArray.push($(element).html()?.trim() ?? '');
      $(element).remove();
    });

    const cleanedHTML = $('body').html()?.replace(/\s+/g, ' ')?.trim() || '';

    return { css: cssArray, html: cleanedHTML };
  }

  /**
   * Extracts text from an HTML string, removing specified elements before extraction.
   * @param html - The input HTML string.
   * @returns The extracted text without unwanted elements.
   */
  public extractCleanText(html: string): string {
    if (!html) {
      return null;
    }

    const $ = cheerio.load(html);

    $(
      'script, a, style, iframe, noscript, base, link[rel="stylesheet"]',
    ).remove();

    return $.root().text().replace(/\s+/g, ' ').trim();
  }

  public getFirstValidElement(
    $: cheerio.CheerioAPI,
    selector: string,
    type = 'text',
    index = 0,
  ) {
    const elements = $(selector);

    if (index >= elements.length) {
      return null;
    }

    const element = elements.eq(index);

    let value = null;
    if (type === 'text') {
      value = element.text().trim();
    } else if (type === 'href') {
      value = element.attr('href');
    } else if (type === 'src') {
      value = element.attr('src');
    }

    if (value) {
      return value;
    }

    return this.getFirstValidElement($, selector, type, index + 1);
  }

  public async showSomeInfosAndPrompt($: cheerio.CheerioAPI) {
    console.log(
      'breadcrumbs:',
      this.coloredText(
        ELogColor.FgYellow,
        `${$('#wayfinding-breadcrumbs_feature_div').text()}`,
      ),
    );
    console.log(
      'brand:',
      this.coloredText(
        ELogColor.FgYellow,
        `${$('#dp .po-brand td:nth-child(2)').text()?.trim()}`,
      ),
    );
    console.log(
      'alcohol_type:',
      this.coloredText(
        ELogColor.FgYellow,
        `${$('#dp .po-alcohol_type td:nth-child(2)').text()?.trim()}`,
      ),
    );

    if (
      !$('#wayfinding-breadcrumbs_feature_div').length &&
      !$('#dp .po-brand td:nth-child(2)').length
    ) {
      console.log(
        cheerio
          .load(this.optimizeHtml($.html()))
          .text()
          ?.replace(/\s+/g, ' ')
          ?.trim(),
      );
    }

    return await select({
      message: 'What are we doing?',
      options: [
        {
          value: 'continue',
          label: 'Continue (and extract product data anyway)',
        },
        { value: 'skip', label: 'Skip' },
        { value: 'stop', label: 'Stop' },
      ],
    });
  }
}
