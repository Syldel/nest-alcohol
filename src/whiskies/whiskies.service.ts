import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Whisky } from './schemas/whisky.schema';
import { CreateWhiskyInput } from './dto/create-whisky.input';
import { ExploreService } from '../services';

@Injectable()
export class WhiskiesService {
  constructor(
    @InjectModel(Whisky.name) private whiskyModel: Model<Whisky>,
    private readonly exploreService: ExploreService,
  ) {}

  async onModuleInit() {
    this.exploreService.start();

    /*
    const whiskyData = {
      nom: 'Glenfiddich',
      age: 12,
      region: 'Écosse',
    };

    // Crée le whisky en base
    await this.create(whiskyData);
    console.log('Whisky créé :', whiskyData);
    */
  }

  async findAll(): Promise<Whisky[]> {
    return this.whiskyModel.find().exec();
  }

  async create(input: CreateWhiskyInput): Promise<Whisky> {
    const newWhisky = new this.whiskyModel(input);
    return newWhisky.save();
  }
}
