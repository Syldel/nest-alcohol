import { Module } from '@nestjs/common';
import { ExploreService, JsonService, UtilsService } from '../services';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [ExploreService, UtilsService, JsonService],
  exports: [ExploreService],
})
export class ExploreModule {}
