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

  /**
   * The specific channel the student paid through. Deliberately has NO default:
   * an absent field marks a legacy payment created before this was captured, and
   * those are reported under an "unknown" bucket rather than being mis-attributed.
   * 'instapay'/'vodafone' pair with paymentMethod 'Online'; 'cash'/'visa' with 'Offline'.
   */
  @Prop({ enum: ['instapay', 'vodafone', 'cash', 'visa'], index: true })
  paymentChannel: string;

  @Prop()
  paymentReferenceCode: string;

  @Prop({ default: 'Pending', enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Expired', 'Refunded'] })
  status: string;

  @Prop()
  adminReviewedById: number;

  @Prop()
  reviewedAt: Date;

  @Prop()
  reviewNotes: string;

  // Set when an admin approves a subscription-cancellation request.
  @Prop()
  refundAmount: number;

  @Prop()
  refundedAt: Date;

  @Prop()
  refundedBy: number;

  @Prop()
  refundReason: string;

  @Prop({ unique: true, index: true })
  numericId: number;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.pre('save', function (next) {
  if (this.isNew || !this.numericId) {
    this.numericId = parseInt(this._id.toString().slice(-8), 16) % 100000;
  }
  next();
});

PaymentSchema.index({ studentId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ subscriptionPlanId: 1 });
