import { IsString, IsEmail, MinLength, MaxLength, Matches, IsIn } from 'class-validator';

export class StaffRegistrationDTO {
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

  @IsString()
  @IsIn(['Admin', 'Conductor', 'Driver', 'MovementManager'], {
    message: 'Role must be one of Admin, Conductor, Driver, or MovementManager.',
  })
  role: string;
}
