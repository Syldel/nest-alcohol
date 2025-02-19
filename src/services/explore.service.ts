import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { decode } from 'entities';

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
      this.coloredLog(ELogColor.FgRed, `STOP EXPLORATION!`);
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

  private addExplorationLink(link: Link) {
    if (link && link.addToExploration) {
      this.coloredLog(ELogColor.FgGreen, `Lien ${link.url} ajouté!\n`);
      const { asin, url, explored } = link;
      this.links.push({ asin, url, explored });
    }
  }

  public async start() {
    console.log('ExploreService::start');
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
        {
          asin: 'B07BPLMSMC',
          url: '/dp/B07BPLMSMC',
          explored: null,
        },
        // {
        //   url: `/s?k=${this.targetKeyword}`,
        //   explored: null,
        // },
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
              `Échec de la création du Alcohol : ${error.message}`,
            );
          } else {
            this.coloredLog(
              ELogColor.FgRed,
              `Échec de la création du Alcohol : ${error.message}`,
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
        this.coloredLog(ELogColor.FgRed, `> break while`);
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
        'Explored links:',
        exploredLinks,
        '/',
        this.links.length,
        '-',
        explorationPercent,
      );

      await this.jsonService.writeJsonFile(jsonExplorationPath, {
        data: this.links,
      });

      this.coloredLog(ELogColor.FgCyan, `Wait 10s...`);
      await this.utilsService.waitSeconds(10000);

      break;
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
    await this.page.goto(url);
    // ... extraction des données avec Puppeteer ...

    // Récupérer le contenu HTML après le rendu de la page
    const html = await this.page.content();

    // Charger le HTML dans Cheerio
    const $ = cheerio.load(html);
    this.cheerioAPI = $;

    const canonicalLink = $('link[rel="canonical"]').attr('href');
    this.coloredLog(ELogColor.FgCyan, `link canonical: ${canonicalLink}`);

    let link: Link;
    if ($('.octopus-page-style').length > 0) {
      $('.octopus-page-style .octopus-pc-item').each((index, element) => {
        link = this.extractLink(index, element);
        this.addExplorationLink(link);
      });
    }

    if ($('#search').length > 0) {
      $('#search [role="listitem"]').each((index, element) => {
        link = this.extractLink(index, element);
        this.addExplorationLink(link);
      });
    }

    if ($('#dp').length > 0) {
      $('#dp .a-carousel-card').each((index, element) => {
        link = this.extractLink(index, element);
        this.addExplorationLink(link);
      });

      const familyLinks: FamilyLink[] = [];
      $('#dp .apm-tablemodule-table th').each((index, element) => {
        link = this.extractLinkFromTable(index, element);
        this.addExplorationLink(link);
        if (link && link.asin && link.thumbSrc && link.title) {
          const { asin, thumbSrc, title } = link;
          familyLinks.push({
            asin,
            thumbSrc: this.processImageUrl(thumbSrc),
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

      const dpClass = $('#dp').attr('class');
      console.log('#dp class', dpClass);
      if (dpClass?.length > 0 && !dpClass.includes('alcoholic_beverage')) {
        this.coloredLog(
          ELogColor.FgRed,
          'alcoholic_beverage IS NOT IN THE dpClass > RETURN!!!',
        );
        return;
      }
      if (dpClass?.length > 0 && !dpClass.includes(this.langCountryCode)) {
        this.coloredLog(
          ELogColor.FgRed,
          `${this.langCountryCode} IS NOT IN THE dpClass > RETURN!!!`,
        );
        return;
      }

      if ($('#ppd').length > 0) {
        const breadStr = $('#wayfinding-breadcrumbs_feature_div')
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
          this.coloredLog(
            ELogColor.FgRed,
            `${this.targetKeyword}s IS NOT IN THE breadcrumbs > RETURN!!!`,
          );
          return;
        }
        const breadcrumbs = breadStr.split('›').map((bread) => bread.trim());
        console.log('breadcrumbs:', breadcrumbs);

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
          '#ppd #averageCustomerReviews #acrPopover a i >span',
        )
          .text()
          ?.trim();

        const customerReviewText = $(
          '#ppd #averageCustomerReviews #acrCustomerReviewText',
        )
          .text()
          ?.trim();

        const reviewsStr = `${avgCustomerReviews} (${customerReviewText})`;
        console.log('reviewsStr:', reviewsStr);

        let reviews: Reviews = null;
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
        } else {
          this.coloredLog(ELogColor.FgRed, `No prices found!`);
          this.stopExploration(true);
          return;
        }
        console.log('prices:', prices);

        /* ********************************************************************************* */

        // console.log(
        //   'vatMessage',
        //   $('#ppd #apex_desktop_snsAccordionRowMiddle #vatMessage_feature_div')
        //     .text()
        //     ?.trim(),
        // );

        const { images, thumbnails } = await this.getViewerImages($);
        console.log('images:', images);
        console.log('thumbnails:', thumbnails);

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

        // Supprimer tous les caractères U+200E (LRM)
        details = details.map((d) => ({
          legend: d.legend.replace(/\u200E/g, ''),
          value: d.value.replace(/\u200E/g, ''),
        }));

        details = this.utilsService.removeDuplicates(
          details,
          (item) => `${item.legend}-${item.value}`,
        );

        /* ******************************* */

        let productDescription = $('#dp #productDescription').html()?.trim();
        productDescription = this.utilsService.cleanHtml(productDescription);
        productDescription = this.optimizeHtml(productDescription);
        console.log('productDescription:', productDescription);

        if (
          $('#dp #productDescription').text()?.replace(/\s+/g, ' ')?.trim() !==
          cheerio.load(productDescription).text()?.replace(/\s+/g, ' ')?.trim()
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
          timestamps: {
            created: Date.now(),
          },
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
        };

        //console.log('finalAlcohol', finalAlcohol);

        return finalAlcohol;
      }
    }
  }

  private processImageUrl(url: string): string {
    try {
      const id = this.extractImageIdFromUrl(url);
      const params = this.extractImageParamsFromUrl(url);

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
        this.coloredLog(ELogColor.FgRed, 'url already in links\n');
        addToExploration = false;
      }
      const productId = this.extractASIN(href);
      console.log('asin:', productId);
      if (!productId && href.startsWith('/vdp/')) {
        this.coloredLog(ELogColor.FgRed, 'vdp => Lien non ajouté!\n');
        addToExploration = false;
        return;
      }
      if (productId && this.links.find((obj) => obj.asin === productId)) {
        this.coloredLog(
          ELogColor.FgRed,
          'ASIN already in links => Lien non ajouté!\n',
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
    console.log('extractLinkFromTable title:', title);
    console.log('extractLinkFromTable href:', href);
    console.log('extractLinkFromTable thumbSrc:', thumbSrc);

    return this.manageLinkAdding(href, thumbSrc, title);
  }

  private extractLink(i: number, element: any): Link {
    const $element = this.cheerioAPI(element);
    // const titre = $element.find('.a-link-normal [data-rows]').text().trim();
    let href = $element.find('.a-link-normal').attr('href');

    if (href && href.startsWith('/s?')) {
      const url = new URL(`${this.websiteExploreHost}${href}`);
      const params = new URLSearchParams(url.search);
      if (!params.get('k').includes(this.targetKeyword)) {
        console.log(`k not includes ${this.targetKeyword} > RETURN\n`);
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

    // const thumbDynamicImage = JSON.parse(
    //   $element.find('.a-link-normal img').attr('data-a-dynamic-image') || '{}',
    // );

    // console.log('extractLink titre:', titre);
    console.log('extractLink href:', href);
    console.log('extractLink thumbSrc:', thumbSrc);

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
      console.log('shortlink:', shortlink, '\n');
    }
    return shortlink;
  }

  public optimizeHtml(html: string): string {
    const $ = cheerio.load(html, { xml: true }, false);

    // Supprimer les balises inutiles
    $('script, style, iframe, noscript, base, link[rel="stylesheet"]').remove();

    // Supprimer les commentaires
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

    // Supprimer les balises vides (sauf exceptions)
    $('*:empty').not('img, br, meta, link').remove();

    $('span.a-text-bold').each(function () {
      $(this).replaceWith(`<strong>${$(this).html()}</strong>`);
    });

    // Nettoyer les attributs inutiles
    $('[style], [class], [data-tracking], [onclick], [onmouseover]').removeAttr(
      'style class data-tracking onclick onmouseover',
    );

    // Supprimer les liens <a> sans href
    $('a:not([href]), a[href=""]').remove();

    let htmlContent = $.html().replace(/\s+/g, ' ').trim();

    // Remplacer les balises mal fermées </br> par un remplacement propre
    htmlContent = htmlContent.replace(/<\/br>/g, '');

    // Décoder les entités HTML pour garder les caractères spéciaux sous leur forme réelle
    htmlContent = decode(htmlContent);

    return htmlContent;
  }
}
