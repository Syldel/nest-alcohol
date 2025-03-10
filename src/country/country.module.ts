import { Module } from '@nestjs/common';

import { CountryService } from './country.service';
import { CountryController } from './country.controller';
import { UtilsService } from '../services';

@Module({
  providers: [CountryService, UtilsService],
  exports: [CountryService],
  controllers: [CountryController],
})
export class CountryModule {}
