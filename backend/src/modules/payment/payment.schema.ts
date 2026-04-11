import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ required: true })
  studentId: number;

  @Prop({ required: true })
  subscriptionPlanId: number;

  @Prop({ required: true })
  amount: number;

  @Prop()
  subscriptionCode: string;

  @Prop({ required: true, enum: ['Offline', 'Online'] })
  paymentMethod: string;

  @Prop()
  paymentReferenceCode: string;

  @Prop({ default: 'Pending', enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Expired'] })
  status: string;

  @Prop()
  adminReviewedById: number;

  @Prop()
  reviewedAt: Date;

  @Prop()
  reviewNotes: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ studentId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ subscriptionPlanId: 1 });
