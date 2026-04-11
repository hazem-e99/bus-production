import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class VoteAnswerDTO {
  @IsNumber()
  questionIndex: number;

  @IsString()
  answer: string;
}

export class SubmitVoteDTO {
  @IsString()
  surveyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoteAnswerDTO)
  answers: VoteAnswerDTO[];
}
