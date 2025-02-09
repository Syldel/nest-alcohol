import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class WhiskyType {
  @Field()
  id: string;

  @Field()
  asin: string;

  @Field()
  nom: string;

  @Field(() => Int, { nullable: true })
  age?: number;

  @Field({ nullable: true })
  region?: string;
}
