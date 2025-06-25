import { Body, Controller, Get, Post } from '@nestjs/common';
import { VeniceService } from './venice.service';

@Controller('venice')
export class VeniceController {
  constructor(private readonly veniceService: VeniceService) {}

  @Get('models')
  async getModels() {
    return this.veniceService.getModels();
  }

  @Post('chat')
  async chat(@Body('prompt') prompt: string) {
    return this.veniceService.chatCompletions(prompt);
  }
}
