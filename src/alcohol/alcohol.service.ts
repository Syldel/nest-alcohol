import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Alcohol } from './entities/alcohol.entity';
import {
  CreateAlcoholInput,
  validateCreateAlcoholInput,
} from './entities/create-alcohol-input.entity';
import { BaseService } from '../services';

@Injectable()
export class AlcoholService extends BaseService {
  constructor(
    @InjectModel(Alcohol.name) private readonly alcoholModel: Model<Alcohol>,
  ) {
    super();
  }

  async findAll(): Promise<Alcohol[]> {
    return this.alcoholModel.find().exec();
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
