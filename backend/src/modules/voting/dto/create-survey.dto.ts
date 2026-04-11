import { IsString, IsArray, IsBoolean, IsOptional, ValidateNested, IsEnum, MinLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class SurveyQuestionDTO {
  @IsString()
  @MinLength(1)
  questionText: string;

  @IsEnum(['multiple-choice', 'yes-no', 'rating', 'text'])
  questionType: string;

  @IsArray()
  @IsOptional()
  options?: string[];

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class CreateSurveyDTO {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDTO)
  questions: SurveyQuestionDTO[];

  @IsBoolean()
  @IsOptional()
  isRecurringDaily?: boolean;

  @IsString()
  @IsOptional()
  dailyOpenTime?: string;

  @IsString()
  @IsOptional()
  dailyCloseTime?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
