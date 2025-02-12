import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Alcohol, AlcoholSchema } from './entities/alcohol.entity';
import { AlcoholResolver } from './alcohol.resolver';
import { AlcoholService } from './alcohol.service';
import { ExploreModule } from '../services/explore.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alcohol.name, schema: AlcoholSchema }]),
    ExploreModule,
  ],
  providers: [AlcoholService, AlcoholResolver],
})
export class AlcoholModule {}
