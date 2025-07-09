import { Field, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';

import { Details } from './details.entity';

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
}
