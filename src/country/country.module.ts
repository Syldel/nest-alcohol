import { Module } from '@nestjs/common';

import { CountryService } from './country.service';
import { CountryController } from './country.controller';

@Module({
  providers: [CountryService],
  controllers: [CountryController],
  exports: [CountryService],
})
export class CountryModule {}
