import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['Admin', 'Student', 'Driver', 'Conductor', 'MovementManager'] })
  role: string;

  @Prop()
  phoneNumber: string;

  @Prop({ unique: true, sparse: true })
  nationalId: string;

  @Prop({ default: 'Active', enum: ['Active', 'Inactive', 'Suspended'] })
  status: string;

  @Prop()
  profilePictureUrl: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  verificationCode: string;

  @Prop()
  verificationCodeExpires: Date;

  @Prop()
  resetToken: string;

  @Prop()
  resetTokenExpires: Date;

  // Student-specific fields
  @Prop()
  studentAcademicNumber: string;

  @Prop()
  department: string;

  @Prop()
  yearOfStudy: string;

  @Prop()
  emergencyContact: string;

  @Prop()
  emergencyPhone: string;

  // Driver-specific fields
  @Prop()
  licenseNumber: string;

  @Prop()
  experience: number;

  @Prop()
  assignedBusId: number;

  @Prop()
  assignedRouteId: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1 });
