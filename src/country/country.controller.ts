import { Body, Controller, Post } from '@nestjs/common';
import { CountryService, FilterOptions } from './country.service';

interface SearchParamsDto {
  term: string;
  options?: FilterOptions;
}

@Controller('country')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post('search')
  async searchCountries(@Body() body: SearchParamsDto) {
    return this.countryService.searchCountriesOrRegions(
      body.term,
      body.options,
    );
  }
}
