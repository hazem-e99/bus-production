import { IsNotEmpty, IsString } from 'class-validator';

export class PurgeDatabaseDto {
  @IsString({ message: 'Confirmation phrase is required.' })
  @IsNotEmpty({ message: 'Confirmation phrase is required.' })
  confirmationPhrase: string;

  @IsString({ message: 'Your current password is required.' })
  @IsNotEmpty({ message: 'Your current password is required.' })
  password: string;
}
