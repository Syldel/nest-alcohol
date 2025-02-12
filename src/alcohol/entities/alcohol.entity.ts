import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IsString } from 'class-validator';

@ObjectType()
@Schema()
export class Alcohol extends Document {
  @Field(() => ID)
  @Prop({ type: Types.ObjectId })
  id: string;

  @Field()
  @Prop()
  @IsString()
  asin: string;

  @Field()
  @Prop()
  @IsString()
  name: string;
}

export const AlcoholSchema = SchemaFactory.createForClass(Alcohol);
