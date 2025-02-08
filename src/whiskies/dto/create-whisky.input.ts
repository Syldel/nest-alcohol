import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateWhiskyInput {
  @Field()
  nom: string;

  @Field(() => Int, { nullable: true })
  age?: number;

  @Field({ nullable: true })
  region?: string;
}
