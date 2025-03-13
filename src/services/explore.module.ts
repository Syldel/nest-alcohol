import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ExploreService, JsonService, UtilsService } from '../services';
import { AlcoholModule } from '../alcohol/alcohol.module';
import { CompressService } from '../compress/compress.service';
import { HuggingFaceModule } from '../huggingface/huggingface.module';
import { CountryModule } from '../country/country.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AlcoholModule,
    HuggingFaceModule,
    CountryModule,
  ],
  providers: [ExploreService, UtilsService, JsonService, CompressService],
  exports: [ExploreService],
})
export class ExploreModule {}
