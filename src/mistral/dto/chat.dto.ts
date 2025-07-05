import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AskDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  max_tokens?: number;
}
