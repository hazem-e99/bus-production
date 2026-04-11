import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class StudentRegistrationDTO {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  lastName: string;

  @IsString()
  @Matches(/^\d{14}$/, { message: 'National ID must be exactly 14 digits' })
  nationalId: string;

  @IsEmail()
  @MinLength(1)
  email: string;

  @IsString()
  @Matches(/^01[0-2,5]{1}[0-9]{8}$/, { message: 'Invalid phone number format' })
  phoneNumber: string;

  @IsString()
  @MinLength(1)
  studentAcademicNumber: string;

  @IsString()
  department: string;

  @IsString()
  yearOfStudy: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsString()
  @MinLength(1)
  confirmPassword: string;
}
