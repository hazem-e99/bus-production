import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

@Schema({ timestamps: true, collection: 'subscriptionplans' })
export class SubscriptionPlan {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  maxNumberOfRides: number;

  @Prop({ required: true })
  durationInDays: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);
