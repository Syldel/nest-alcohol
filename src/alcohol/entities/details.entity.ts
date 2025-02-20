import { Field, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';
import { IsString, IsDefined, IsNotEmpty } from 'class-validator';

@ObjectType()
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
