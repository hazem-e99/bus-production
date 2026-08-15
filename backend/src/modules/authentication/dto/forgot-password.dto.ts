import { IsEmail, MinLength, IsString, IsOptional } from 'class-validator';

export class ForgotPasswordDTO {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MinLength(1, { message: 'Email address is required.' })
  email: string;

  @IsOptional()
  @IsString({ message: 'Reset token must be a string.' })
  resetToken?: string;

  @IsOptional()
  @IsString({ message: 'Action must be a string.' })
  action?: string;
}
