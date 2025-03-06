import { Module } from '@nestjs/common';
import { HuggingFaceService } from './huggingface.service';
import { HuggingFaceController } from './huggingface.controller';
import { HttpClientService } from '../services/http-client.service';
import { UtilsService } from '../services';

@Module({
  providers: [HuggingFaceService, HttpClientService, UtilsService],
  controllers: [HuggingFaceController],
  exports: [HuggingFaceService],
})
export class HuggingFaceModule {}
