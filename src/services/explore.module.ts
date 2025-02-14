import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExploreService, JsonService, UtilsService } from '../services';
import { AlcoholModule } from '../alcohol/alcohol.module';

@Module({
  imports: [ConfigModule.forRoot(), AlcoholModule],
  providers: [ExploreService, UtilsService, JsonService],
  exports: [ExploreService],
})
export class ExploreModule {}
