import { Global, Module } from '@nestjs/common';

import { JsonService } from './json.service';
import { JsonProcessingService } from './json-processing.service';
import { UtilsService } from './utils.service';
import { HttpClientService } from './http-client.service';

@Global()
@Module({
  providers: [
    JsonService,
    JsonProcessingService,
    UtilsService,
    HttpClientService,
  ],
  exports: [
    JsonService,
    JsonProcessingService,
    UtilsService,
    HttpClientService,
  ],
})
export class SharedModule {}
