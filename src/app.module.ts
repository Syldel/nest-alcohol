import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExploreModule } from './services/explore.module';
import { CompressModule } from './compress/compress.module';
import { HuggingFaceModule } from './huggingface/huggingface.module';
import { CountryModule } from './country/country.module';

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
    ExploreModule,
    CompressModule,
    HuggingFaceModule,
    CountryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
