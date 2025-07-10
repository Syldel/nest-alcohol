import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Alcohol, AlcoholSchema } from './entities/alcohol.entity';
import { AlcoholResolver } from './alcohol.resolver';
import { AlcoholService } from './alcohol.service';
import { AlcoholMaintenanceService } from './alcohol-maintenance.service';
import { CountryModule } from '../country/country.module';
import { MistralModule } from '../mistral/mistral.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alcohol.name, schema: AlcoholSchema }]),
    CountryModule,
    MistralModule,
  ],
  providers: [AlcoholService, AlcoholResolver, AlcoholMaintenanceService],
  exports: [MongooseModule, AlcoholService],
})
export class AlcoholModule {}
