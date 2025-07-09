import { Injectable, OnModuleInit } from '@nestjs/common';

import { AlcoholService } from './alcohol.service';
import {
  Country,
  CountryService,
  FilterOptions,
} from '../country/country.service';
import { CountryInfo } from './entities/country-info.entity';
import { AlcoholDocument } from './entities/alcohol.entity';
import { UtilsService } from '@services/utils.service';
import { AiUtilsService } from '@services/ai-utils.service';
import { MistralService } from '../mistral/mistral.service';
import { AIContent } from './entities/ai-content.entity';

@Injectable()
export class AlcoholMaintenanceService implements OnModuleInit {
  constructor(
    private readonly alcoholService: AlcoholService,
    private readonly countryService: CountryService,
    private readonly utilsService: UtilsService,
    private readonly mistralService: MistralService,
    private readonly aiUtilsService: AiUtilsService,
  ) {}

  async onModuleInit() {
    const args = process.argv.slice(2);
    if (args.includes('--maintenance')) {
      await this.fixMissingFrenchNames();
      await this.fixMissingCountryIsoCodes();
      await this.formatMarqueDetails();
      await this.generateAiContents();
    }
  }

  private async fixMissingFrenchNames() {
    // 1. Country names missing 'fr'
    const results =
      await this.alcoholService.findAllWhereCountryNameMissing('fr');
    console.log(
      `[Maintenance] ${results.length} items missing country.names.fr`,
    );

    for (const alcohol of results) {
      console.log(`\nasin: ${alcohol.asin}`);
      console.log(
        `Missing 'fr' for: ${alcohol.country?.names?.en || '[Unnamed]'}`,
      );

      if (alcohol.country?.names?.en) {
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
        const foundCountries =
          await this.countryService.searchCountriesOrRegions(
            alcohol.country?.names?.en?.trim(),
            filterOptions,
          );
        if (foundCountries.length > 1) {
          console.log('foundCountries.length:', foundCountries.length);
        }

        if (foundCountries.length === 1) {
          const country = foundCountries[0];
          console.dir(country, { depth: 4, colors: true });

          if (
            country.iso &&
            country.iso3 &&
            country.names?.en &&
            (country.names?.fr === 'La Réunion' ||
              country.names?.fr === 'Martinique' ||
              country.names?.fr === 'Guadeloupe')
          ) {
            delete country.regions;
            await this.saveAlcoholCountry(alcohol, country);
          }

          if (
            country.iso &&
            country.iso3 &&
            country.names?.en &&
            country.names?.fr &&
            country.regions &&
            (country.regions[0]?.names?.en === country.names?.en ||
              country.regions[0]?.names?.fr === country.names?.fr)
          ) {
            delete country.regions;
            await this.saveAlcoholCountry(alcohol, country);
          }

          if (
            country.iso &&
            country.iso3 &&
            country.names?.en &&
            country.names?.fr &&
            !country.regions
          ) {
            await this.saveAlcoholCountry(alcohol, country);
          }
        }
      } else {
        console.log(`${alcohol.country?.names?.en} undefined!`);
      }
    }

    // 2. Region names missing 'fr'
    const regionResults =
      await this.alcoholService.findAllWhereRegionNameMissing('fr');
    console.log(
      `[Maintenance] ${regionResults.length} items with region(s) missing names.fr`,
    );

    for (const alcohol of regionResults) {
      console.log(`\nasin: ${alcohol.asin}`);
      console.log(
        `Missing 'fr' for: ${alcohol.country?.regions[0].names?.en || '[Unnamed]'}`,
      );

      for (const region of alcohol.country?.regions ?? []) {
        console.log('region:', region);
        if (alcohol.country.names?.en === region.names?.en) {
          delete alcohol.country.regions;
          alcohol.markModified('country.regions');

          console.log('alcohol.country:', alcohol.country);
          console.log('alcohol.save()');
          await alcohol.save();

          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
      }
    }
  }

  private async saveAlcoholCountry(
    alcohol: AlcoholDocument,
    country: Country,
  ): Promise<void> {
    alcohol.country = this.transformCountryToCountryInfo(country);
    console.log('alcohol.save()');
    await alcohol.save();

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private transformCountryToCountryInfo(country: Country): CountryInfo {
    if (!country) return null;

    const countryInfo = new CountryInfo();

    countryInfo.names = {
      en: country.names.en ?? '',
      fr: country.names.fr ?? '',
    };
    countryInfo.iso = country.iso;
    countryInfo.iso3 = country.iso3;

    if (country.regions) {
      countryInfo.regions = country.regions.map((region) => ({
        iso: region.iso,
        names: {
          en: region.names?.en ?? '',
          fr: region.names?.fr ?? '',
        },
      }));
    }

    return countryInfo;
  }

  /**
   * Fixes missing or empty iso and iso3 codes for countries in alcohol documents.
   */
  private async fixMissingCountryIsoCodes(): Promise<void> {
    // Fix missing iso3
    const missingIso3Results =
      await this.alcoholService.findAllWhereCountryFieldMissing('iso3');
    console.log(
      `[Maintenance] ${missingIso3Results.length} items missing country.iso3`,
    );

    for (const alcohol of missingIso3Results) {
      console.log(`\nasin: ${alcohol.asin}`);
      console.log(
        `Missing 'iso3' for: ${alcohol.country?.names?.en || '[Unnamed]'}`,
      );

      if (
        alcohol.country?.names?.en === 'Champagne' ||
        alcohol.country?.names?.fr === 'Champagne'
      ) {
        const country = {
          names: {
            fr: 'France',
            en: 'France',
          },
          iso: 'FR',
          iso3: 'FRA',
          regions: [
            {
              names: {
                fr: 'Champagne',
                en: 'Champagne',
              },
              iso: 'GE',
            },
          ],
        };

        alcohol.country = country;
        console.log('alcohol.save()');
        await alcohol.save();

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (alcohol.country?.names?.en) {
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
        const foundCountries =
          await this.countryService.searchCountriesOrRegions(
            alcohol.country?.names?.en?.trim(),
            filterOptions,
          );
        if (foundCountries.length > 1) {
          console.log('foundCountries.length:', foundCountries.length);
        }

        if (foundCountries.length === 1) {
          const country = foundCountries[0];
          console.dir(country, { depth: 4, colors: true });

          if (
            country.iso &&
            country.iso3 &&
            country.names?.en &&
            country.names?.fr &&
            country.regions &&
            (country.regions[0]?.names?.en === country.names?.en ||
              country.regions[0]?.names?.fr === country.names?.fr)
          ) {
            delete country.regions;
            console.dir(country, { depth: 4, colors: true });
          }

          await this.saveAlcoholCountry(alcohol, country);
        }
      } else {
        console.log(`${alcohol.country?.names?.en} undefined!`);
      }
    }
  }

  private async formatMarqueDetails(): Promise<void> {
    const alcohols = await this.alcoholService.getAll();

    console.log(`[Maintenance] ${alcohols.length} alcohols found`);

    for (const alcohol of alcohols) {
      let updated = false;
      let oldMarqueValue = '';

      for (let i = 0; i < alcohol.details.length; i++) {
        const detail = alcohol.details[i];
        if (detail.legend === 'Marque' && typeof detail.value === 'string') {
          const capitalized = this.utilsService.capitalizeWords(detail.value);

          if (capitalized !== detail.value) {
            oldMarqueValue = detail.value;
            detail.value = capitalized;
            updated = true;
            alcohol.markModified(`details.${i}.value`);
          }
        }
      }

      if (updated) {
        const savedAlcohol = await alcohol.save();
        const marqueDetail = savedAlcohol.details.find(
          (d) => d.legend === 'Marque',
        );
        console.log(
          `✔ Updated ASIN: ${alcohol.asin} (${oldMarqueValue} => ${marqueDetail?.value})`,
        );
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }

  private async generateAiContents(): Promise<void> {
    const alcohols = await this.alcoholService.getAll();

    console.log(
      `[Maintenance] (AI contents) ${alcohols.length} alcohols found`,
    );

    function isEmptyAI(ai?: AIContent): boolean {
      if (!ai) return true;
      return (
        !ai.metaTitle &&
        !ai.metaDescription &&
        !ai.description &&
        (!ai.details || ai.details.length === 0)
      );
    }

    let i = 0;
    const total = alcohols.length;
    for (const alcohol of alcohols) {
      i++;
      if (alcohol.ai && !isEmptyAI(alcohol.ai)) {
        console.log(
          `[${i}/${total}] ${alcohol.asin} alcohol.ai already exists!`,
        );
        continue;
      }

      const detailsOneLiner =
        alcohol.details?.map((d) => `${d.legend}: ${d.value}`).join(', ') || '';

      const featuresStr = alcohol.features?.join(', ') || '';

      const description = alcohol.description?.product || '';

      const countryName = alcohol.country
        ? alcohol.country.names?.fr || alcohol.country.names?.en || ''
        : '';

      const regionName = alcohol.country?.regions?.[0]
        ? alcohol.country.regions[0].names?.fr ||
          alcohol.country.regions[0].names?.en ||
          ''
        : '';

      // Donne également **features** qui correspond aux "Caractéristiques", sous forme de array de strings ["...", "..."].
      // "features": ["...", "..."],

      // Ajoute un parapgraphe sur la brasserie, marque ou distillerie dans **producer**.
      // "producer": "...",

      const prompt = `
        Tu es un expert en rédaction SEO.
        À partir des informations suivantes sur un spiritueux, génère un **meta title** et une **meta description** optimisés pour le référencement (SEO) (en français).
        Donne surtout **description** qui correspond à "Description produit" et qui doit comporter le même nombre de paragraphes ou plus.
        Sous forme [{ legend: "...", value: "..."}], mettre dans **details**, les principales caractéristiques comme: Marque, Type, Volume, Degré, Saveur, Pays, Région, Spécificité.

        Les règles :
        - Le **meta title** doit faire moins de 70 caractères.
        - La **meta description** doit faire moins de 160 caractères.
        - Utilise un ton naturel, clair et vendeur.
        - Ne répète pas mécaniquement les mots-clés, varie la formulation.
        - Mets en avant les spécificités du produit (marque, type, origine, volume, particularités).
        - éviter le "duplicate content".
        - éviter le "low-quality AI content".
        - Les textes doivent être factuellement exacts. Utilisez uniquement les informations fournies. Reformulez ou paraphrasez pour améliorer la lisibilité, mais n'inventez aucune information.
        - Utiliser des balises HTML comme <p></p> pour séparer les paragraphes.

        Les données produit :
        - Nom : "${alcohol.name}"
        - Type : "${alcohol.type}"
        - Pays : "${countryName}"
        - Région : "${regionName}"
        - Description produit : "${description}"
        - Détails : "${detailsOneLiner}"
        - Caractéristiques : "${featuresStr}"

        Réponds **uniquement** avec un objet JSON, sans autre texte, au format suivant :

        \`\`\`json
        {
          "metaTitle": "...",
          "metaDescription": "...",
          "description": "...",
          "details": [{ legend: "...", value: "..."}]
        }
        \`\`\`

        N'oublie surtout pas les trois quotes (\`) au début et à la fin.
      `;

      const mistralResult = await this.mistralService.chatCompletions(
        { prompt }, // , max_tokens: 1500
        1,
      );

      // console.dir(mistralResult, { depth: 5, colors: true });
      // console.log('Mistral message content:', mistralResult?.fullContent);

      if (mistralResult?.fullContent) {
        const generatedText = mistralResult?.fullContent;
        const optimizedAnswerText = generatedText.replace(prompt, '');
        const mistralData =
          this.aiUtilsService.extractCodeBlocks(optimizedAnswerText);

        console.dir(mistralData, { depth: 5, colors: true });

        if (mistralData.length === 1) {
          if (this.isValidAIContent(mistralData[0])) {
            alcohol.ai = mistralData[0];
            await alcohol.save();
            console.log(`[${i}/${total}] ✔ ${alcohol.asin} alcohol.ai saved!`);
            await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
          } else {
            console.error('BREAK mistralData is not valid');
            break;
          }
        } else {
          console.error('BREAK mistralData.length:', mistralData.length);
          break;
        }
      } else {
        console.error(
          'BREAK mistralResult.fullContent:',
          mistralResult?.fullContent,
        );
        break;
      }
    }
  }

  private isValidAIContent(ai: any): boolean {
    if (typeof ai !== 'object' || ai === null) return false;

    const allowedKeys = [
      'metaTitle',
      'metaDescription',
      'description',
      'details',
    ];
    const actualKeys = Object.keys(ai);

    // Vérifie que toutes les clés présentes sont valides
    if (!actualKeys.every((key) => allowedKeys.includes(key))) {
      return false;
    }

    // Vérifie le type des champs simples (optionnel mais recommandé)
    if (
      (ai.metaTitle && typeof ai.metaTitle !== 'string') ||
      (ai.metaDescription && typeof ai.metaDescription !== 'string') ||
      (ai.description && typeof ai.description !== 'string')
    ) {
      return false;
    }

    // Vérifie les objets dans le tableau details
    if (ai.details) {
      if (!Array.isArray(ai.details)) return false;

      for (const item of ai.details) {
        if (
          typeof item !== 'object' ||
          item === null ||
          Object.keys(item).length !== 2 ||
          !('legend' in item) ||
          !('value' in item)
        ) {
          return false;
        }
      }
    }

    return true;
  }
}
