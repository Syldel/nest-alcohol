import { Field, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';

@ObjectType()
export class Images {
  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  bigs?: string[];

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  thumbnails?: string[];
}
