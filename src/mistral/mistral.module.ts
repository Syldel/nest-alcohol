import { Module } from '@nestjs/common';

import { MistralService } from './mistral.service';
import { MistralController } from './mistral.controller';
import { AiUtilsService } from '@services/ai-utils.service';

@Module({
  controllers: [MistralController],
  providers: [MistralService, AiUtilsService],
  exports: [MistralService, AiUtilsService],
})
export class MistralModule {}
