import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginDTO {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MinLength(5, { message: 'Email must be at least 5 characters long.' })
  @MaxLength(100, { message: 'Email must not exceed 100 characters.' })
  email: string;

  @IsString({ message: 'Password is required.' })
  @MinLength(1, { message: 'Password is required.' })
  password: string;

  @IsOptional()
  @IsBoolean({ message: 'rememberMe must be true or false.' })
  rememberMe?: boolean;
}
