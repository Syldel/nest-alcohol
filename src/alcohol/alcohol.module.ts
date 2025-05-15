import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Alcohol, AlcoholSchema } from './entities/alcohol.entity';
import { AlcoholResolver } from './alcohol.resolver';
import { AlcoholService } from './alcohol.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alcohol.name, schema: AlcoholSchema }]),
  ],
  providers: [AlcoholService, AlcoholResolver],
  exports: [MongooseModule, AlcoholService],
})
export class AlcoholModule {}
