import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'System', enum: ['System', 'Alert', 'Announcement', 'Reminder', 'Booking'] })
  type: string;

  @Prop({ default: () => new Date() })
  sentAt: Date;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ sentAt: -1 });
