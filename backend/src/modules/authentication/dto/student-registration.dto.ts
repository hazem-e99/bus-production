import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class StudentRegistrationDTO {
  @IsString({ message: 'First name is required.' })
  @MinLength(2, { message: 'First name must be at least 2 characters long.' })
  @MaxLength(20, { message: 'First name must not exceed 20 characters.' })
  firstName: string;

  @IsString({ message: 'Last name is required.' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long.' })
  @MaxLength(20, { message: 'Last name must not exceed 20 characters.' })
  lastName: string;

  @IsString()
  @Matches(/^\d{14}$/, { message: 'National ID must be exactly 14 digits.' })
  nationalId: string;

  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MinLength(1, { message: 'Email address is required.' })
  email: string;

  @IsString()
  @Matches(/^01[0-2,5]{1}[0-9]{8}$/, { message: 'Please enter a valid Egyptian phone number.' })
  phoneNumber: string;

  @IsString({ message: 'Academic number is required.' })
  @MinLength(1, { message: 'Academic number is required.' })
  studentAcademicNumber: string;

  @IsString({ message: 'Department is required.' })
  department: string;

  @IsString({ message: 'Year of study is required.' })
  yearOfStudy: string;

  @IsString({ message: 'Password is required.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsString({ message: 'Please confirm your password.' })
  @MinLength(1, { message: 'Please confirm your password.' })
  confirmPassword: string;
}
