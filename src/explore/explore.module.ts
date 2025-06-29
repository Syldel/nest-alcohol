import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AlcoholModule } from '../alcohol/alcohol.module';
import { HuggingFaceModule } from '../huggingface/huggingface.module';
import { VeniceModule } from '../venice/venice.module';
import { CountryModule } from '../country/country.module';
import { CompressModule } from '../compress/compress.module';
import { ExploreService } from './explore.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AlcoholModule,
    HuggingFaceModule,
    VeniceModule,
    CountryModule,
    CompressModule,
  ],
  providers: [ExploreService],
  exports: [ExploreService],
})
export class ExploreModule {}
