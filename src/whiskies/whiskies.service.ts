import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Whisky } from './schemas/whisky.schema';
import { CreateWhiskyInput } from './dto/create-whisky.input';
import { ExploreService, UtilsService } from '../services';
import { ELogColor } from 'src/services/utils.service';

@Injectable()
export class WhiskiesService {
  private readonly logger = new Logger(WhiskiesService.name);

  constructor(
    @InjectModel(Whisky.name) private whiskyModel: Model<Whisky>,
    private readonly exploreService: ExploreService,
    private readonly utilsService: UtilsService,
  ) {}

  async onModuleInit() {
    this.exploreService.start();

    const whiskyData = {
      asin: '654321',
      nom: 'Glenfiddich',
      age: 12,
      region: 'Écosse',
    };

    try {
      await this.create(whiskyData);
      this.utilsService.coloredLog(
        ELogColor.FgGreen,
        `Whisky créé : ${JSON.stringify(whiskyData)}`,
      );
      this.logger.log(`Whisky créé : ${JSON.stringify(whiskyData)}`);
    } catch (error) {
      this.utilsService.coloredLog(
        ELogColor.FgRed,
        `Échec de la création du whisky : ${error.message}`,
      );
      this.logger.warn(`Échec de la création du whisky : ${error.message}`);
    }
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
