import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';

@ObjectType()
export class Reviews {
  @Field(() => Float, { nullable: true })
  @Prop({ required: false, default: 0 })
  rating?: number;

  @Field(() => Int, { nullable: true })
  @Prop({ required: false, default: 0 })
  ratingCount?: number;
}
