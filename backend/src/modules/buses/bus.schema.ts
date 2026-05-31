import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusDocument = Bus & Document;

@Schema({ timestamps: true, collection: 'buses' })
export class Bus {
  @Prop({ required: true, unique: true })
  busNumber: string;

  @Prop({ required: true, default: 0 })
  speed: number;

  @Prop({ required: true })
  capacity: number;

  @Prop({ required: true, default: 'Active', enum: ['Active', 'Inactive', 'UnderMaintenance', 'OutOfService'] })
  status: string;

  @Prop()
  fuelLevel: number;

  @Prop({ type: { lat: Number, lng: Number } })
  location: { lat: number; lng: number };

  @Prop({ unique: true, index: true })
  numericId: number;
}

export const BusSchema = SchemaFactory.createForClass(Bus);

BusSchema.pre('save', function (next) {
  if (this.isNew || !this.numericId) {
    this.numericId = parseInt(this._id.toString().slice(-8), 16) % 100000;
  }
  next();
});

BusSchema.index({ status: 1 });
