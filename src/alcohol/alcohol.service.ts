import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseService } from '@services/base.service';

import { Alcohol, AlcoholDocument } from './entities/alcohol.entity';
import {
  CreateAlcoholInput,
  validateCreateAlcoholInput,
} from './entities/create-alcohol-input.entity';
import { AlcoholFilterInput } from './entities/alcohol-filter-input.entity';
import { CountryInfo } from './entities/country-info.entity';

@Injectable()
export class AlcoholService extends BaseService {
  constructor(
    @InjectModel(Alcohol.name)
    private readonly alcoholModel: Model<AlcoholDocument>,
  ) {
    super();
  }

  async findOne(id: string): Promise<Alcohol> {
    return this.alcoholModel.findById(id).exec();
  }

  async findByFilter(filter?: AlcoholFilterInput): Promise<Alcohol[]> {
    const query: any = {};

    if (filter?._id) {
      query._id = filter._id;
    }

    if (filter?.asin) {
      query.asin = filter.asin;
    }

    if (filter?.name) {
      query.name = { $regex: filter.name, $options: 'i' }; // 'i' pour insensible à la casse
    }

    if (filter?.type) {
      query.type = filter.type;
    }

    if (filter?.langCode) {
      query.langCode = filter.langCode;
    }

    if (filter?.detail) {
      query.details = {
        $elemMatch: {
          ...(filter.detail.legend && {
            legend: { $regex: filter.detail.legend, $options: 'i' },
          }), // Insensible à la casse et correspondance partielle
          ...(filter.detail.value && {
            value: { $regex: filter.detail.value, $options: 'i' },
          }), // Insensible à la casse et correspondance partielle
        },
      };
    }

    return this.alcoholModel.find(query).exec();
  }

  /**
   * Retrieves ASINs from the database that already exist among the given list.
   *
   * @param asins - An array of ASIN strings to check for existence.
   * @returns A Promise that resolves to an array of ASINs found in the database.
   */
  async findExistingASINs(asins: string[]): Promise<string[]> {
    const results = await this.alcoholModel
      .find({ asin: { $in: asins } })
      .select('asin')
      .lean()
      .exec();

    return results.map((doc) => doc.asin);
  }

  /**
   * Récupère une liste unique de valeurs pour une `legend` spécifique (ex: "Marque", "Pays").
   *
   * @param {string} legend - Le champ ciblé dans `details` (ex: "Marque", "Pays", "Type").
   * @param {AlcoholFilterInput} [filter] - Filtre optionnel sur le type et la langue.
   * @returns {Promise<string[]>} - Liste triée de valeurs uniques.
   */
  async getUniqueDetailsValues(
    legend: string,
    filter?: AlcoholFilterInput,
  ): Promise<string[]> {
    if (!legend) {
      throw new Error("Le champ 'legend' est obligatoire.");
    }

    const matchStage: any = {
      'details.legend': { $regex: legend, $options: 'i' },
    };

    if (filter?.type) {
      matchStage.type = filter.type;
    }

    if (filter?.langCode) {
      matchStage.langCode = filter.langCode;
    }

    const result = await this.alcoholModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$details' },
        {
          $match: {
            'details.legend': { $regex: legend, $options: 'i' },
          },
        },
        { $group: { _id: '$details.value' } },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return result.map((item) => item._id);
  }

  async getUniqueCountries(
    filter?: AlcoholFilterInput,
  ): Promise<CountryInfo[]> {
    const matchStage: any = { country: { $exists: true } };

    if (filter?.type) {
      matchStage.type = filter.type;
    }

    if (filter?.langCode) {
      matchStage.langCode = filter.langCode;
    }

    const result = await this.alcoholModel
      .aggregate([
        { $match: matchStage },
        { $group: { _id: '$country.iso3', country: { $first: '$country' } } },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return result.map((item) => item.country);
  }

  /**
   * Retrieves a distinct list of detail values names from `alcohol.details.value`
   * based on the provided `legend`, country ISO code, and optional filters.
   *
   * @param {string} legend - The legend to filter brands (case-insensitive).
   * @param {string} [iso] - (Optional) The country ISO code (case-insensitive).
   * @param {AlcoholFilterInput} [filter] - (Optional) Additional filters for type and langCode.
   * @returns {Promise<string[]>} A sorted list of unique brand names.
   *
   * @example
   * { getUniqueDetails(legend: "marque", iso: "fr", filter: { type: "whisky", langCode: "fr_FR" }) }
   */
  async getUniqueDetails(
    legend: string,
    iso?: string,
    filter?: AlcoholFilterInput,
  ): Promise<string[]> {
    if (!legend) {
      throw new Error("The 'legend' field is required.");
    }

    const matchStage: any = {
      'details.legend': { $regex: legend, $options: 'i' },
    };

    if (iso) {
      matchStage['country.iso'] = { $regex: `^${iso}$`, $options: 'i' };
    }

    if (filter?.type) {
      matchStage.type = filter.type;
    }

    if (filter?.langCode) {
      matchStage.langCode = filter.langCode;
    }

    const result = await this.alcoholModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$details' },
        {
          $match: {
            'details.legend': { $regex: legend, $options: 'i' },
          },
        },
        { $group: { _id: '$details.value' } },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return result.map((item) => item._id);
  }

  async create(input: CreateAlcoholInput): Promise<Alcohol> {
    const errors = await validateCreateAlcoholInput(input);
    if (errors.length > 0) {
      errors.forEach((err) =>
        console.log(
          '\x1b[31m',
          `> ${Object.values(err.constraints || {}).join(', ')}`,
          '\x1b[0m',
        ),
      );
      throw new BadRequestException(errors);
    }

    // Vérifier si un alcohol avec le même ASIN existe déjà
    const existingAlcohol = await this.alcoholModel
      .findOne({ asin: input.asin })
      .exec();

    if (existingAlcohol) {
      throw new ConflictException(
        `Un alcohol avec l'ASIN ${input.asin} existe déjà.`,
      );
    }

    const newAlcohol = new this.alcoholModel(input);
    const savedAlcohol = await newAlcohol.save();

    if (!savedAlcohol) {
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement du alcohol.",
      );
    }

    return savedAlcohol;
  }

  /**
   * Finds all alcohol documents where the country name in the specified language is missing.
   *
   * @param lang - The language code to check (e.g. 'fr', 'en', 'es').
   * @returns A promise that resolves to an array of Alcohol documents
   *          where the specified country.names.<lang> field is not present.
   */
  async findAllWhereCountryNameMissing(
    lang: string,
  ): Promise<AlcoholDocument[]> {
    const field = `country.names.${lang}`;
    return this.alcoholModel
      .find({
        [field]: { $exists: false },
      })
      .exec();
  }

  /**
   * Finds all alcohol documents where at least one region is missing a translation
   * for the given language (e.g. `fr`, `en`).
   *
   * @param lang - The language code to check (e.g. 'fr', 'en').
   * @returns A promise that resolves to an array of Alcohol documents
   *          where at least one region lacks the specified translation.
   */
  async findAllWhereRegionNameMissing(
    lang: string,
  ): Promise<AlcoholDocument[]> {
    const field = `names.${lang}`;
    return this.alcoholModel
      .find({
        'country.regions': {
          $elemMatch: {
            [field]: { $exists: false },
          },
        },
      })
      .exec();
  }

  /**
   * Finds all alcohol documents where a specified country field is missing.
   *
   * @param field - The country field to check (e.g. 'iso' or 'iso3').
   * @returns A promise resolving to an array of Alcohol documents.
   */
  async findAllWhereCountryFieldMissing(
    field: 'iso' | 'iso3',
  ): Promise<AlcoholDocument[]> {
    const path = `country.${field}`;
    return this.alcoholModel
      .find({
        [path]: { $exists: false },
      })
      .exec();
  }

  /**
   * Retrieves all Alcohol documents from the database.
   *
   * @returns {Promise<AlcoholDocument[]>} A promise that resolves to an array of all Alcohol documents.
   */
  async getAll(): Promise<AlcoholDocument[]> {
    return this.alcoholModel.find().exec();
  }
}
