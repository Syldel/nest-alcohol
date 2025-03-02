import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { decode } from 'entities';
import { confirm, select } from '@clack/prompts';

import { ELogColor, UtilsService } from './utils.service';
import { JsonService } from './json.service';

import { AlcoholService } from '../alcohol/alcohol.service';
import { PriceItem } from '../alcohol/entities/price.entity';
import { FamilyLink } from '../alcohol/entities/family-link.entity';
import { CreateAlcoholInput } from '../alcohol/entities/create-alcohol-input.entity';
import { Alcohol } from '../alcohol/entities/alcohol.entity';
import { Reviews } from '../alcohol/entities/reviews.entity';
import { Details } from '../alcohol/entities/details.entity';

type Link = {
  asin?: string;
  url?: string;
  explored?: number;
  thumbSrc?: string;
  title?: string;
  addToExploration?: boolean;
};

@Injectable()
export class ExploreService implements OnModuleInit {
  private links: Link[];
  private page: Page;
  private browser: Browser;
  private cheerioAPI: cheerio.CheerioAPI;
  private websiteExploreHost: string;

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

  private addExplorationLink(link: Link) {
    if (link && link.addToExploration) {
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

    // Save links data in a json file
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

      this.coloredLog(ELogColor.FgCyan, `3 minutes left to wait...`);
      await this.utilsService.waitSeconds(1 * 60 * 1000);
      this.coloredLog(ELogColor.FgCyan, `2 minutes left to wait...`);
      await this.utilsService.waitSeconds(1 * 60 * 1000);
      this.coloredLog(ELogColor.FgCyan, `1 minute left to wait...`);
      await this.utilsService.waitSeconds(1 * 60 * 1000);

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
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    );
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

      pageLinks.forEach((link) => this.addExplorationLink(link));
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

          const nweBreadStr = `Epicerie›Bières, vins et spiritueux›Spiritueux›Whiskys`;
          const replaceBreadcrumbs = await confirm({
            message: `Do you want to replace breadcrumbs with '${nweBreadStr}'`,
          });
          if (replaceBreadcrumbs) {
            breadStr = nweBreadStr;
          }
        }
        const breadcrumbs = breadStr.split('›').map((bread) => bread.trim());
        console.log('breadcrumbs:', breadcrumbs);

        /* ********************************************************************************* */

        pageLinks.forEach((link) => this.addExplorationLink(link));

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
        console.log('productTitle:', productTitle);

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

        console.log('details', details);

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
          },
          familyLinks,
          shortlink,
          type: this.targetKeyword,
          langCode: this.langCountryCode,
          newerVersion,
        };

        return finalAlcohol;
      }
    }
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
    console.log('♦ extractLinkFromTable title:', title);
    console.log('♦ extractLinkFromTable href:', href);
    console.log('♦ extractLinkFromTable thumbSrc:', thumbSrc);

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
    console.log('♦ extractLink href:', href);
    console.log('♦ extractLink thumbSrc:', thumbSrc);

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

        //console.log('boundingBox', boundingBox);

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

    let $ = cheerio.load(html, { xml: true }, false);

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
    htmlContent = htmlContent.replace(/<\/br>/g, '');

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
