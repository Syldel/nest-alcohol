import { Module } from '@nestjs/common';
import { CompressService } from './compress.service';
import { CompressController } from './compress.controller';

@Module({
  providers: [CompressService],
  exports: [CompressService],
  controllers: [CompressController],
})
export class CompressModule {}
