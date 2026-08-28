import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepartmentDocument = Department & Document;

/**
 * Admin-managed list of department names offered on the student registration
 * form's "Department" dropdown (also used on the student profile edit and
 * admin student-edit pages). Editable at runtime via the admin CRUD page —
 * see department.controller.ts. Mirrors preferred-area.schema.ts.
 */
@Schema({ timestamps: true, collection: 'departments' })
export class Department {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ unique: true, index: true })
  numericId: number;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

DepartmentSchema.pre('save', function (next) {
  if (this.isNew || !this.numericId) {
    this.numericId = parseInt(this._id.toString().slice(-8), 16) % 100000;
  }
  next();
});
