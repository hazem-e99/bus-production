import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDTO {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MinLength(1, { message: 'Email address is required.' })
  email: string;

  @IsString({ message: 'Reset code is required.' })
  @MinLength(1, { message: 'Reset code is required.' })
  resetToken: string;

  @IsString({ message: 'New password is required.' })
  @MinLength(1, { message: 'New password is required.' })
  newPassword: string;

  @IsString({ message: 'Please confirm your new password.' })
  @MinLength(1, { message: 'Please confirm your new password.' })
  confirmPassword: string;
}
