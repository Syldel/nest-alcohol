import { Controller, Post, Body } from '@nestjs/common';
import { CompressService } from './compress.service';

@Controller('compress')
export class CompressController {
  constructor(private readonly compressService: CompressService) {}

  @Post('compress')
  async compress(@Body() body: { data: string }) {
    const compressed = await this.compressService.compress(body.data);
    return { compressed };
  }

  @Post('decompress')
  async decompress(@Body() body: { data: string }) {
    const decompressed = await this.compressService.decompress(body.data);
    return { decompressed };
  }
}
