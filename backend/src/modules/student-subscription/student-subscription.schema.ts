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
