import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class VoteAnswerDTO {
  @IsNumber({}, { message: 'Question index must be a number.' })
  questionIndex: number;

  @IsString({ message: 'Answer is required.' })
  answer: string;
}

export class SubmitVoteDTO {
  @IsString({ message: 'Survey ID is required.' })
  surveyId: string;

  @IsArray({ message: 'Answers must be a list.' })
  @ValidateNested({ each: true })
  @Type(() => VoteAnswerDTO)
  answers: VoteAnswerDTO[];
}
