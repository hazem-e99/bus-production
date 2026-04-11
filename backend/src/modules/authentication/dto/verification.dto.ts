import { IsEmail, IsString, MinLength } from 'class-validator';

export class VerificationDTO {
  @IsEmail()
  @MinLength(1)
  email: string;

  @IsString()
  @MinLength(1)
  verificationCode: string;
}
