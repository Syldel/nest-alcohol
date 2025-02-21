import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class DetailFilterInput {
  @Field({ nullable: true })
  legend?: string;

  @Field({ nullable: true })
  value?: string;
}

@InputType()
export class AlcoholFilterInput {
  @Field({ nullable: true })
  _id?: string;

  @Field({ nullable: true })
  asin?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  langCode?: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => DetailFilterInput, { nullable: true })
  detail?: DetailFilterInput;
}
