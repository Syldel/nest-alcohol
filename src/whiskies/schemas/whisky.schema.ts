import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Whisky extends Document {
  @Prop({ required: true })
  nom: string;

  @Prop()
  age: number;

  @Prop()
  region: string;
}

export const WhiskySchema = SchemaFactory.createForClass(Whisky);
