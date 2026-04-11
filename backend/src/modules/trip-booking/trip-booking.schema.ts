import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TripBookingDocument = TripBooking & Document;

@Schema({ timestamps: true, collection: 'tripbookings' })
export class TripBooking {
  @Prop({ required: true })
  tripId: number;

  @Prop({ required: true })
  studentId: number;

  @Prop({ required: true })
  pickupStopLocationId: number;

  @Prop({ required: true })
  userSubscriptionId: number;

  @Prop({ default: 'Confirmed', enum: ['Confirmed', 'Cancelled', 'NoShow', 'Completed'] })
  status: string;

  @Prop({ default: () => new Date() })
  bookingDate: Date;

  @Prop()
  cancellationDate: Date;
}

export const TripBookingSchema = SchemaFactory.createForClass(TripBooking);

TripBookingSchema.index({ tripId: 1 });
TripBookingSchema.index({ studentId: 1 });
TripBookingSchema.index({ status: 1 });
TripBookingSchema.index({ bookingDate: 1 });
