import { Module } from '@nestjs/common';
import { CompressService } from './compress.service';

@Module({
  providers: [CompressService],
  exports: [CompressService],
})
export class CompressModule {}
