import { IsEmail, MinLength, IsString, IsOptional } from 'class-validator';

export class ForgotPasswordDTO {
  @IsEmail()
  @MinLength(1)
  email: string;

  @IsOptional()
  @IsString()
  resetToken?: string;

  @IsOptional()
  @IsString()
  action?: string;
}
