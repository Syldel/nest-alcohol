import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';

@ObjectType()
export class Timestamps {
  @Field(() => Int, { nullable: true })
  @Prop({ default: Date.now })
  created?: number;

  @Field(() => Int, { nullable: true })
  @Prop()
  updated?: number;
}
