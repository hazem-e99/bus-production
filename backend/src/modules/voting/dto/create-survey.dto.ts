import { IsString, IsArray, IsBoolean, IsOptional, ValidateNested, IsEnum, MinLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class SurveyQuestionDTO {
  @IsString({ message: 'Question text is required.' })
  @MinLength(1, { message: 'Question text is required.' })
  questionText: string;

  @IsEnum(['multiple-choice', 'yes-no', 'rating', 'text'], {
    message: 'Question type must be one of multiple-choice, yes-no, rating, or text.',
  })
  questionType: string;

  @IsArray({ message: 'Options must be a list.' })
  @IsOptional()
  options?: string[];

  @IsBoolean({ message: 'isRequired must be true or false.' })
  @IsOptional()
  isRequired?: boolean;
}

export class CreateSurveyDTO {
  @IsString({ message: 'Title is required.' })
  @MinLength(1, { message: 'Title is required.' })
  title: string;

  @IsString({ message: 'Description must be a string.' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Questions must be a list.' })
  @ArrayMinSize(1, { message: 'At least one question is required.' })
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDTO)
  questions: SurveyQuestionDTO[];

  @IsBoolean({ message: 'isRecurringDaily must be true or false.' })
  @IsOptional()
  isRecurringDaily?: boolean;

  @IsString({ message: 'Daily open time must be a string.' })
  @IsOptional()
  dailyOpenTime?: string;

  @IsString({ message: 'Daily close time must be a string.' })
  @IsOptional()
  dailyCloseTime?: string;

  @IsString({ message: 'Start date must be a string.' })
  @IsOptional()
  startDate?: string;

  @IsString({ message: 'End date must be a string.' })
  @IsOptional()
  endDate?: string;
}
