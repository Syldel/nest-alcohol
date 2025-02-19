import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema } from '@nestjs/mongoose';
import { IsString, IsDefined, IsNotEmpty } from 'class-validator';

@ObjectType()
@Schema()
export class Details {
  @Field()
  @Prop({ required: true })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'Legend is required' })
  legend: string;

  @Field()
  @Prop({ required: true })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'Value is required' })
  value: string;
}
