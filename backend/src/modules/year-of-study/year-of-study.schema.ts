import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type YearOfStudyDocument = YearOfStudy & Document;

/**
 * Admin-managed list of year-of-study values offered on the student
 * registration form's "Year of Study" dropdown (also used on the student
 * profile edit and admin student-edit pages). Editable at runtime via the
 * admin CRUD page — see year-of-study.controller.ts. Mirrors
 * preferred-area.schema.ts.
 */
@Schema({ timestamps: true, collection: 'yearsofstudy' })
export class YearOfStudy {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ unique: true, index: true })
  numericId: number;
}

export const YearOfStudySchema = SchemaFactory.createForClass(YearOfStudy);

YearOfStudySchema.pre('save', function (next) {
  if (this.isNew || !this.numericId) {
    this.numericId = parseInt(this._id.toString().slice(-8), 16) % 100000;
  }
  next();
});
