import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExploreService, JsonService, UtilsService } from '../services';
import { AlcoholModule } from '../alcohol/alcohol.module';
import { CompressService } from '../compress/compress.service';

@Module({
  imports: [ConfigModule.forRoot(), AlcoholModule],
  providers: [ExploreService, UtilsService, JsonService, CompressService],
  exports: [ExploreService],
})
export class ExploreModule {}
