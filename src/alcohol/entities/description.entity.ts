import { Field, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';

@ObjectType()
export class Description {
  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: '' })
  product?: string;

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  images?: string[];

  @Field(() => String, { nullable: true })
  @Prop({ type: String, default: '' })
  manufacturer?: string;

  @Field(() => Boolean, { nullable: true })
  @Prop({ type: Boolean, default: false })
  cocktail?: boolean;
}
