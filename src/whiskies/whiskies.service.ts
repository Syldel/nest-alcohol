import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Whisky } from './schemas/whisky.schema';
import { CreateWhiskyInput } from './dto/create-whisky.input';

@Injectable()
export class WhiskiesService {
  constructor(@InjectModel(Whisky.name) private whiskyModel: Model<Whisky>) {}

  async findAll(): Promise<Whisky[]> {
    return this.whiskyModel.find().exec();
  }

  async create(input: CreateWhiskyInput): Promise<Whisky> {
    const newWhisky = new this.whiskyModel(input);
    return newWhisky.save();
  }
}
