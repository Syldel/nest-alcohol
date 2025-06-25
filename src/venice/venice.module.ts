import { Module } from '@nestjs/common';
import { VeniceService } from './venice.service';
import { VeniceController } from './venice.controller';

@Module({
  controllers: [VeniceController],
  providers: [VeniceService],
  exports: [VeniceService],
})
export class VeniceModule {}
