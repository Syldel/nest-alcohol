import { Field, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';

import { Details } from './details.entity';

@ObjectType()
export class FAQ {
  @Field()
  @Prop({ required: true })
  question: string;

  @Field()
  @Prop({ required: true })
  answer: string;
}

@ObjectType()
export class OG {
  @Field()
  @Prop({ required: true })
  title: string;

  @Field()
  @Prop({ required: true })
  description: string;
}

@ObjectType()
export class Cocktail {
  @Field()
  @Prop({ required: true })
  title: string;

  @Field(() => [String])
  @Prop({ type: [String], required: true })
  ingredients: string[];

  @Field()
  @Prop({ required: true })
  instructions: string;
}

@ObjectType()
export class AIContent {
  @Field({ nullable: true })
  @Prop({ default: '' })
  metaTitle?: string;

  @Field({ nullable: true })
  @Prop({ default: '' })
  metaDescription?: string;

  @Field({ nullable: true })
  @Prop({ default: '' })
  description?: string;

  @Field(() => [Details], { nullable: true })
  @Prop({ type: [Details], required: false })
  details?: Details[];

  @Field({ nullable: true })
  @Prop({ default: '' })
  slug?: string;

  @Field({ nullable: true })
  @Prop({ default: '' })
  h1?: string;

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  keywords?: string[];

  @Field(() => [FAQ], { nullable: true })
  @Prop({ type: [FAQ], required: false })
  faq?: FAQ[];

  @Field(() => OG, { nullable: true })
  @Prop({ type: OG, required: false })
  og?: OG;

  @Field(() => [Cocktail], { nullable: true })
  @Prop({ type: [Cocktail], required: false })
  cocktails?: Cocktail[];
}
