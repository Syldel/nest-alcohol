import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhiskiesService } from './whiskies.service';
import { WhiskiesResolver } from './whiskies.resolver';
import { Whisky, WhiskySchema } from './schemas/whisky.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Whisky.name, schema: WhiskySchema }]),
  ],
  providers: [WhiskiesService, WhiskiesResolver],
})
export class WhiskiesModule {}
