import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExploreModule } from './explore/explore.module';
import { CompressModule } from './compress/compress.module';
import { HuggingFaceModule } from './huggingface/huggingface.module';
import { CountryModule } from './country/country.module';
import { SharedModule } from './services/shared.module';
import { BackupModule } from './backup/backup.module';
import { VeniceModule } from './venice/venice.module';
import { MistralModule } from './mistral/mistral.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: !isProduction,
      sortSchema: true,
      debug: !isProduction,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    ScheduleModule.forRoot(),
    ExploreModule,
    CompressModule,
    HuggingFaceModule,
    VeniceModule,
    MistralModule,
    CountryModule,
    SharedModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
