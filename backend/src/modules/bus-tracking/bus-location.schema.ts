import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusLocationDocument = BusLocation & Document;

@Schema({ timestamps: true, collection: 'bus_locations' })
export class BusLocation {
  @Prop({ required: true, index: true })
  busId: number;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ default: 0 })
  speed: number;

  @Prop({ required: true })
  driverId: string;

  @Prop({ default: true })
  isTracking: boolean;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const BusLocationSchema = SchemaFactory.createForClass(BusLocation);

BusLocationSchema.index({ busId: 1 }, { unique: true });
BusLocationSchema.index({ driverId: 1 });
BusLocationSchema.index({ isTracking: 1 });
