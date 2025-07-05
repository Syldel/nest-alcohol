import { Body, Controller, Post } from '@nestjs/common';

import { MistralService } from './mistral.service';
import { AskDto } from './dto/chat.dto';

@Controller('mistral')
export class MistralController {
  constructor(private readonly mistralService: MistralService) {}

  @Post('chat')
  async chat(@Body() body: AskDto) {
    return this.mistralService.chatCompletions(body);
  }
}
