import { Field, InputType, OmitType } from '@nestjs/graphql';
import { Alcohol } from './alcohol.entity';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreateAlcoholInput extends OmitType(Alcohol, [
  'asin',
  'name',
] as const) {
  // Le champ 'id' n'est pas inclus ici

  // On rend 'asin' requis à la création
  @Field()
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'asin is required' })
  asin: string;

  // On rend 'name' requis à la création
  @Field()
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'name is required' })
  name: string;
}
