import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const NOTIFICATION_TYPES = ['System', 'Alert', 'Announcement', 'Reminder', 'Booking'];

export class CreateNotificationDto {
  @IsInt({ message: 'User ID must be a number.' })
  userId: number;

  @IsString({ message: 'Title is required.' })
  @MinLength(1, { message: 'Title is required.' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters.' })
  title: string;

  @IsString({ message: 'Message is required.' })
  @MinLength(1, { message: 'Message is required.' })
  @MaxLength(1000, { message: 'Message must not exceed 1000 characters.' })
  message: string;

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES, { message: `Type must be one of ${NOTIFICATION_TYPES.join(', ')}.` })
  type?: string;
}

export class BroadcastNotificationDto {
  @IsString({ message: 'Title is required.' })
  @MinLength(1, { message: 'Title is required.' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters.' })
  title: string;

  @IsString({ message: 'Message is required.' })
  @MinLength(1, { message: 'Message is required.' })
  @MaxLength(1000, { message: 'Message must not exceed 1000 characters.' })
  message: string;

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES, { message: `Type must be one of ${NOTIFICATION_TYPES.join(', ')}.` })
  type?: string;

  @IsOptional()
  @IsArray({ message: 'userIds must be a list of numbers.' })
  @IsInt({ each: true, message: 'Each user ID must be a number.' })
  userIds?: number[];
}
