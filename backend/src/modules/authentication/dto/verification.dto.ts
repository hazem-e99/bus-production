import { IsEmail, IsString, MinLength } from 'class-validator';

export class VerificationDTO {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MinLength(1, { message: 'Email address is required.' })
  email: string;

  @IsString({ message: 'Verification code is required.' })
  @MinLength(1, { message: 'Verification code is required.' })
  verificationCode: string;
}
