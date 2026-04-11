import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true, collection: 'attendance' })
export class Attendance {
  @Prop({ required: true })
  tripId: number;

  @Prop({ required: true })
  studentId: number;

  @Prop({ default: 'Present', enum: ['Present', 'Absent', 'Late', 'Excused'] })
  status: string;

  @Prop({ default: () => new Date() })
  markedAt: Date;

  @Prop()
  notes: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ tripId: 1 });
AttendanceSchema.index({ studentId: 1 });
