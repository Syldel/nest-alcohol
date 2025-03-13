import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IsString } from 'class-validator';

import { backupDocument } from './alcohol.middleware';

import { PriceItem } from './price.entity';
import { Description } from './description.entity';
import { Images } from './images.entity';
import { FamilyLink } from './family-link.entity';
import { Reviews } from './reviews.entity';
import { Details } from './details.entity';
import { CountryInfo } from './country-info.entity';

export type AlcoholDocument = Alcohol & Document;

@ObjectType()
@Schema({ timestamps: true })
export class Alcohol {
  @Field(() => ID)
  _id: string;

  @Field()
  @Prop()
  @IsString()
  asin: string;

  @Field()
  @Prop()
  @IsString()
  name: string;

  @Field()
  @Prop()
  @IsString()
  type: string;

  @Field()
  @Prop()
  @IsString()
  shortlink: string;

  @Field(() => [PriceItem], { nullable: true })
  @Prop({ type: [PriceItem], required: false })
  prices?: PriceItem[];

  @Field(() => Description, { nullable: true })
  @Prop({ type: Description, default: { product: '', images: [] } })
  description?: Description;

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: '' })
  @IsString()
  langCode?: string;

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  features?: string[];

  @Field(() => Images, { nullable: true })
  @Prop({ type: Images, required: false })
  images?: Images;

  @Field(() => [FamilyLink], { nullable: true })
  @Prop({ type: [FamilyLink], required: false })
  familyLinks?: FamilyLink[];

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  breadcrumbs?: string[];

  @Field(() => Reviews, { nullable: true })
  @Prop({ type: Reviews, default: { rating: 0, ratingCount: 0 } })
  reviews?: Reviews;

  @Field(() => [Details], { nullable: true })
  @Prop({ type: [Details], required: false })
  details?: Details[];

  @Field(() => FamilyLink, { nullable: true })
  @Prop({ type: FamilyLink, required: false })
  newerVersion?: FamilyLink;

  @Field(() => CountryInfo, { nullable: true })
  @Prop({ type: CountryInfo, required: false })
  country?: CountryInfo;
}

const AlcoholSchema = SchemaFactory.createForClass(Alcohol);

AlcoholSchema.post('save', backupDocument);

export { AlcoholSchema };
