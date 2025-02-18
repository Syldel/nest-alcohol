import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Prop } from '@nestjs/mongoose';
import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

@ObjectType()
export class PriceDetail {
  @Field(() => Float)
  @Prop({ required: true })
  @IsNumber()
  @IsDefined()
  @IsNotEmpty({ message: 'price is required' })
  price: number;

  @Field(() => String)
  @Prop({ required: true })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'currency is required' })
  currency: string;
}

@ObjectType()
export class PriceItem {
  @Field(() => PriceDetail, { nullable: true }) // Rendre le champ optionnel dans GraphQL
  @Prop({ type: PriceDetail, required: false }) // Rendre le champ optionnel dans Mongoose
  @IsOptional()
  @IsNotEmpty({ message: 'priceToPay cannot be empty' })
  priceToPay?: PriceDetail;

  @Field(() => PriceDetail, { nullable: true }) // Rendre le champ optionnel dans GraphQL
  @Prop({ type: PriceDetail, required: false }) // Rendre le champ optionnel dans Mongoose
  @IsOptional()
  @IsNotEmpty({ message: 'basisPrice cannot be empty' }) // S'assure qu'il n'est pas vide s'il est fourni
  basisPrice?: PriceDetail;

  @Field(() => Int)
  @Prop({ required: true })
  @IsDefined()
  @IsNotEmpty({ message: 'timestamp is required' })
  timestamp: number;
}
