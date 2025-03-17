import { Module } from '@nestjs/common';

import { CountryService } from './country.service';
import { CountryController } from './country.controller';
import { JsonProcessingService, UtilsService } from '../services';

@Module({
  providers: [CountryService, UtilsService, JsonProcessingService],
  controllers: [CountryController],
  exports: [CountryService],
})
export class CountryModule {}
