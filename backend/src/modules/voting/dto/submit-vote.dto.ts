import { IsString, IsArray, ValidateNested, IsInt, Min, IsMongoId, ArrayMaxSize, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class VoteAnswerDTO {
  @IsInt({ message: 'Question index must be a whole number.' })
  @Min(0, { message: 'Question index must be a whole number.' })
  questionIndex: number;

  /** Coarse transport guard; the 2000-character limit for text answers is enforced after trimming. */
  @IsString({ message: 'Answer is required.' })
  @MaxLength(4000, { message: 'Answer is too long.' })
  answer: string;
}

export class SubmitVoteDTO {
  @IsString({ message: 'Survey ID is required.' })
  @IsMongoId({ message: 'Survey ID is invalid.' })
  surveyId: string;

  @IsArray({ message: 'Answers must be a list.' })
  @ArrayMaxSize(100, { message: 'Too many answers.' })
  @ValidateNested({ each: true })
  @Type(() => VoteAnswerDTO)
  answers: VoteAnswerDTO[];
}
