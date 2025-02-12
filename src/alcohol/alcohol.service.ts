import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { takeUntil } from 'rxjs';
import { validate } from 'class-validator';

import { Alcohol } from './entities/alcohol.entity';
import { CreateAlcoholInput } from './entities/create-alcohol-input.entity';
import { BaseService, ExploreService } from '../services';

@Injectable()
export class AlcoholService extends BaseService implements OnModuleInit {
  constructor(
    @InjectModel(Alcohol.name) private readonly alcoholModel: Model<Alcohol>,
    private readonly exploreService: ExploreService,
  ) {
    super();
  }

  async onModuleInit() {
    this.listenToAlcoholEvents();
    this.exploreService.start();
  }

  private async createAlcohol(alcoholData: Alcohol) {
    try {
      await this.create(alcoholData);
      this.logger.log(`Alcohol créé : ${JSON.stringify(alcoholData)}`);
    } catch (error) {
      this.logger.warn(`Échec de la création du alcohol : ${error.message}`);
    }
  }

  private listenToAlcoholEvents() {
    this.exploreService
      .getAlcoholStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alcohol: Alcohol) => {
          this.createAlcohol(alcohol);
        },
        error: (err) => this.logger.error('❌ Erreur :', err),
      });
  }

  async findAll(): Promise<Alcohol[]> {
    return this.alcoholModel.find().exec();
  }

  async create(input: CreateAlcoholInput): Promise<Alcohol> {
    const instance = new CreateAlcoholInput();
    Object.assign(instance, input);
    const errors = await validate(instance);
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
