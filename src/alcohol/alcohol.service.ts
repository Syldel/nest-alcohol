import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseService } from '../services';
import { Alcohol, AlcoholDocument } from './entities/alcohol.entity';
import {
  CreateAlcoholInput,
  validateCreateAlcoholInput,
} from './entities/create-alcohol-input.entity';
import { AlcoholFilterInput } from './entities/alcohol-filter-input.entity';

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
      // 'i' pour insensible à la casse
      query.name = { $regex: filter.name, $options: 'i' };
    }

    if (filter?.detail) {
      query.details = {
        $elemMatch: {
          ...(filter.detail.legend && { legend: filter.detail.legend }),
          ...(filter.detail.value && { value: filter.detail.value }),
        },
      };
    }

    return this.alcoholModel.find(query).exec();
  }

  async create(input: CreateAlcoholInput): Promise<Alcohol> {
    const errors = await validateCreateAlcoholInput(input);
    if (errors.length > 0) {
      errors.forEach((err) =>
        console.log(
          '\x1b[31m',
          `> ${Object.values(err.constraints || {}).join(', ')}`,
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
}
