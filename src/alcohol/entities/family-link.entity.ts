import { Field, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

@ObjectType()
export class FamilyLink {
  @Field(() => String)
  @Prop({ type: String, required: true })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'asin is required' })
  asin: string;

  @Field(() => String)
  @Prop({ type: String, required: true })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'thumbSrc is required' })
  thumbSrc: string;

  @Field(() => String)
  @Prop({ type: String, required: true })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'title is required' })
  title: string;
}
