import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

const CANCELLATION_DECISIONS = ['Approved', 'Rejected'];

/** Student asks to cancel their active subscription. A reason is mandatory. */
export class RequestCancellationDto {
  @IsString({ message: 'A cancellation reason is required.' })
  @MinLength(3, { message: 'The cancellation reason must be at least 3 characters long.' })
  @MaxLength(500, { message: 'The cancellation reason must not exceed 500 characters.' })
  reason: string;
}

/** Admin approves or rejects a pending cancellation request. */
export class ReviewCancellationDto {
  @IsIn(CANCELLATION_DECISIONS, { message: `Status must be one of ${CANCELLATION_DECISIONS.join(', ')}.` })
  status: string;

  @IsOptional()
  @IsString({ message: 'Review notes must be text.' })
  @MaxLength(500, { message: 'Review notes must not exceed 500 characters.' })
  reviewNotes?: string;

  /** Defaults to the full paid amount when omitted. */
  @IsOptional()
  @IsNumber({}, { message: 'Refund amount must be a number.' })
  @Min(0, { message: 'Refund amount cannot be negative.' })
  refundAmount?: number;
}
