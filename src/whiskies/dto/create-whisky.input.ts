import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateWhiskyInput {
  @Field()
  asin: string;

  @Field()
  nom: string;

  @Field(() => Int, { nullable: true })
  age?: number;

  @Field({ nullable: true })
  region?: string;
}
