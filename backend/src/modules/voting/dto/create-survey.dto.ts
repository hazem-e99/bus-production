import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsEnum,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
  IsDateString,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HH_MM_PATTERN } from '../voting-time.util';

export class SurveyQuestionDTO {
  @IsString({ message: 'Question text is required.' })
  @MinLength(1, { message: 'Question text is required.' })
  @MaxLength(500, { message: 'Question text must be at most 500 characters.' })
  questionText: string;

  @IsEnum(['multiple-choice', 'yes-no', 'rating', 'text'], {
    message: 'Question type must be one of multiple-choice, yes-no, rating, or text.',
  })
  questionType: string;

  @IsArray({ message: 'Options must be a list.' })
  @ArrayMaxSize(50, { message: 'A question can have at most 50 options.' })
  @IsString({ each: true, message: 'Each option must be a string.' })
  @MaxLength(200, { each: true, message: 'Each option must be at most 200 characters.' })
  @IsOptional()
  options?: string[];

  @IsBoolean({ message: 'isRequired must be true or false.' })
  @IsOptional()
  isRequired?: boolean;
}

export class CreateSurveyDTO {
  @IsString({ message: 'Title is required.' })
  @MinLength(1, { message: 'Title is required.' })
  @MaxLength(200, { message: 'Title must be at most 200 characters.' })
  title: string;

  @IsString({ message: 'Description must be a string.' })
  @MaxLength(2000, { message: 'Description must be at most 2000 characters.' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Questions must be a list.' })
  @ArrayMinSize(1, { message: 'At least one question is required.' })
  @ArrayMaxSize(100, { message: 'A survey can have at most 100 questions.' })
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDTO)
  questions: SurveyQuestionDTO[];

  @IsBoolean({ message: 'isRecurringDaily must be true or false.' })
  @IsOptional()
  isRecurringDaily?: boolean;

  /** Start of the daily OPEN window ("HH:mm"). May be later than dailyCloseTime for overnight windows. */
  @Matches(HH_MM_PATTERN, { message: 'Daily open time must be in HH:mm format.' })
  @IsOptional()
  dailyOpenTime?: string;

  /** End of the daily OPEN window ("HH:mm", exclusive). */
  @Matches(HH_MM_PATTERN, { message: 'Daily close time must be in HH:mm format.' })
  @IsOptional()
  dailyCloseTime?: string;

  @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD).' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD).' })
  @IsOptional()
  endDate?: string;

  /** numericIds of the subscription plans allowed to vote. Empty = any active subscriber. */
  @IsArray({ message: 'Eligible plans must be a list.' })
  @ArrayMaxSize(100, { message: 'Too many eligible plans.' })
  @IsInt({ each: true, message: 'Each eligible plan must be a plan id.' })
  @IsOptional()
  eligiblePlanIds?: number[];
}
