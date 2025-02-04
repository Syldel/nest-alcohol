import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Whisky } from './schemas/whisky.schema';

@Injectable()
export class WhiskiesService {
  constructor(@InjectModel(Whisky.name) private whiskyModel: Model<Whisky>) {}

  async findAll(): Promise<Whisky[]> {
    return this.whiskyModel.find().exec();
  }
}
