import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TripRouteDocument = TripRoute & Document;

@Schema({ timestamps: true, collection: 'routes' })
export class TripRoute {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  startLocation: string;

  @Prop({ required: true })
  endLocation: string;

  @Prop({ required: true })
  distance: number;

  @Prop({ required: true })
  estimatedTime: string;

  @Prop({ type: [String], default: [] })
  stopLocations: string[];
}

export const TripRouteSchema = SchemaFactory.createForClass(TripRoute);
