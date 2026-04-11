import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VotingSurveyDocument = VotingSurvey & Document;
export type VoteResponseDocument = VoteResponse & Document;

@Schema({ _id: false })
export class SurveyQuestion {
  @Prop({ required: true })
  questionText: string;

  @Prop({ required: true, enum: ['multiple-choice', 'yes-no', 'rating', 'text'] })
  questionType: string;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ default: false })
  isRequired: boolean;
}

export const SurveyQuestionSchema = SchemaFactory.createForClass(SurveyQuestion);

@Schema({ timestamps: true, collection: 'voting_surveys' })
export class VotingSurvey {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  createdByUserId: number;

  @Prop()
  createdByName: string;

  @Prop({ type: [SurveyQuestionSchema], required: true })
  questions: SurveyQuestion[];

  @Prop({ default: false })
  isRecurringDaily: boolean;

  @Prop()
  dailyOpenTime: string;

  @Prop()
  dailyCloseTime: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  startDate: string;

  @Prop()
  endDate: string;
}

export const VotingSurveySchema = SchemaFactory.createForClass(VotingSurvey);

VotingSurveySchema.index({ isActive: 1 });
VotingSurveySchema.index({ createdByUserId: 1 });

@Schema({ timestamps: true, collection: 'vote_responses' })
export class VoteResponse {
  @Prop({ required: true })
  surveyId: string;

  @Prop({ required: true })
  studentId: number;

  @Prop()
  studentName: string;

  @Prop()
  studentEmail: string;

  @Prop({ required: true })
  voteDateKey: string;

  @Prop({ type: [{ questionIndex: Number, answer: String }], required: true })
  answers: Array<{ questionIndex: number; answer: string }>;
}

export const VoteResponseSchema = SchemaFactory.createForClass(VoteResponse);

VoteResponseSchema.index({ surveyId: 1, studentId: 1, voteDateKey: 1 }, { unique: true });
VoteResponseSchema.index({ surveyId: 1 });
VoteResponseSchema.index({ studentId: 1 });
