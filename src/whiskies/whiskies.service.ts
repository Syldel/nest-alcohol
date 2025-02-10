import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Whisky } from './schemas/whisky.schema';
import { CreateWhiskyInput } from './dto/create-whisky.input';
import { BaseService, ExploreService } from '../services';
import { WhiskyType } from './dto/whisky.dto';
import { takeUntil } from 'rxjs';

@Injectable()
export class WhiskiesService extends BaseService implements OnModuleInit {
  constructor(
    @InjectModel(Whisky.name) private whiskyModel: Model<Whisky>,
    private readonly exploreService: ExploreService,
  ) {
    super();
  }

  async onModuleInit() {
    this.listenToWhiskyEvents();
    this.exploreService.start();
  }

  private async createWhisky(whiskyData: WhiskyType) {
    try {
      await this.create(whiskyData);
      this.logger.log(`Whisky créé : ${JSON.stringify(whiskyData)}`);
    } catch (error) {
      this.logger.warn(`Échec de la création du whisky : ${error.message}`);
    }
  }

  private listenToWhiskyEvents() {
    this.exploreService
      .getWhiskyStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (whisky: WhiskyType) => {
          this.createWhisky(whisky);
        },
        error: (err) => this.logger.error('❌ Erreur :', err),
      });
  }

  async findAll(): Promise<Whisky[]> {
    return this.whiskyModel.find().exec();
  }

  async create(input: CreateWhiskyInput): Promise<Whisky> {
    // Vérifier si un whisky avec le même ASIN existe déjà
    const existingWhisky = await this.whiskyModel
      .findOne({ asin: input.asin })
      .exec();

    if (existingWhisky) {
      throw new ConflictException(
        `Un whisky avec l'ASIN ${input.asin} existe déjà.`,
      );
    }

    const newWhisky = new this.whiskyModel(input);
    const savedWhisky = await newWhisky.save();

    if (!savedWhisky) {
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement du whisky.",
      );
    }

    return savedWhisky;
  }
}
