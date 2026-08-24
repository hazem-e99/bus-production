import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PreferredAreaDocument = PreferredArea & Document;

/**
 * Admin-managed list of area names offered on the student registration form's
 * "منطقتك المفضلة" (Preferred Area) dropdown. Unlike Department/YearOfStudy
 * (hardcoded in frontend/src/lib/constants.ts), this list is fully editable
 * at runtime via the admin CRUD page — see preferred-area.controller.ts.
 */
@Schema({ timestamps: true, collection: 'preferredareas' })
export class PreferredArea {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ unique: true, index: true })
  numericId: number;
}

export const PreferredAreaSchema = SchemaFactory.createForClass(PreferredArea);

PreferredAreaSchema.pre('save', function (next) {
  if (this.isNew || !this.numericId) {
    this.numericId = parseInt(this._id.toString().slice(-8), 16) % 100000;
  }
  next();
});
