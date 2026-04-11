import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDTO {
  @IsEmail()
  @MinLength(1)
  email: string;

  @IsString()
  @MinLength(1)
  resetToken: string;

  @IsString()
  @MinLength(1)
  newPassword: string;

  @IsString()
  @MinLength(1)
  confirmPassword: string;
}
