import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StudentSubscriptionDocument = StudentSubscription & Document;

@Schema({ timestamps: true, collection: 'studentsubscriptions' })
export class StudentSubscription {
  @Prop({ required: true })
  studentId: number;

  @Prop({ required: true })
  subscriptionPlanId: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'Active', enum: ['Active', 'Expired', 'Cancelled', 'Suspended', 'PendingActivation', 'PendingPayment'] })
  status: string;

  @Prop()
  paymentMethod: string;

  @Prop()
  paymentReferenceCode: string;

  @Prop()
  suspendReason: string;

  /**
   * Student-initiated cancellation request state. Legacy documents predate these
   * fields and read as undefined — always compare with `?? 'None'`.
   * Flow: student requests -> 'Pending' -> admin approves ('Approved', subscription
   * cancelled + payment refunded) or rejects ('Rejected', subscription stays active).
   */
  @Prop({ default: 'None', enum: ['None', 'Pending', 'Approved', 'Rejected'], index: true })
  cancellationStatus: string;

  @Prop()
  cancellationReason: string;

  @Prop()
  cancellationRequestedAt: Date;

  @Prop()
  cancellationReviewedById: number;

  @Prop()
  cancellationReviewedAt: Date;

  @Prop()
  cancellationReviewNotes: string;

  /** numericId of the Payment that was refunded when the cancellation was approved. */
  @Prop()
  cancelledPaymentId: number;

  @Prop({ unique: true, index: true })
  numericId: number;
}

export const StudentSubscriptionSchema = SchemaFactory.createForClass(StudentSubscription);

StudentSubscriptionSchema.pre('save', function (next) {
  if (this.isNew || !this.numericId) {
    this.numericId = parseInt(this._id.toString().slice(-8), 16) % 100000;
  }
  next();
});

StudentSubscriptionSchema.index({ studentId: 1 });
StudentSubscriptionSchema.index({ status: 1 });
StudentSubscriptionSchema.index({ subscriptionPlanId: 1 });
