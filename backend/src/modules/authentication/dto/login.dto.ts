import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginDTO {
  @IsEmail()
  @MinLength(5)
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
