import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TripDocument = Trip & Document;

@Schema({ _id: false })
export class StopLocation {
  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  arrivalTimeOnly: string;

  @Prop({ required: true })
  departureTimeOnly: string;
}

export const StopLocationSchema = SchemaFactory.createForClass(StopLocation);

@Schema({ timestamps: true, collection: 'trips' })
export class Trip {
  @Prop({ required: true })
  busId: number;

  @Prop({ required: true })
  driverId: number;

  @Prop({ required: true })
  conductorId: number;

  @Prop({ required: true })
  startLocation: string;

  @Prop({ required: true })
  endLocation: string;

  @Prop({ required: true })
  tripDate: string;

  @Prop({ required: true })
  departureTimeOnly: string;

  @Prop({ required: true })
  arrivalTimeOnly: string;

  @Prop({ default: 'Scheduled', enum: ['Scheduled', 'InProgress', 'Completed', 'Cancelled'] })
  status: string;

  @Prop({ type: [StopLocationSchema], default: [] })
  stopLocations: StopLocation[];

  @Prop({ default: 0 })
  bookedSeats: number;

  @Prop({ unique: true, index: true })
  numericId: number;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

TripSchema.pre('save', function (next) {
  if (this.isNew || !this.numericId) {
    this.numericId = parseInt(this._id.toString().slice(-8), 16) % 100000;
  }
  next();
});

TripSchema.index({ tripDate: 1 });
TripSchema.index({ driverId: 1 });
TripSchema.index({ busId: 1 });
TripSchema.index({ status: 1 });
