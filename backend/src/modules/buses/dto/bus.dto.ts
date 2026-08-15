import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const BUS_STATUSES = ['Active', 'Inactive', 'UnderMaintenance', 'OutOfService'];

export class BusDto {
  @IsString({ message: 'Bus number is required.' })
  @MinLength(1, { message: 'Bus number is required.' })
  @MaxLength(20, { message: 'Bus number must not exceed 20 characters.' })
  busNumber: string;

  @IsInt({ message: 'Speed must be a whole number.' })
  @Min(0, { message: 'Speed cannot be negative.' })
  @Max(200, { message: 'Speed must not exceed 200 km/h.' })
  speed: number;

  @IsInt({ message: 'Capacity must be a whole number.' })
  @Min(10, { message: 'Capacity must be at least 10.' })
  @Max(100, { message: 'Capacity must not exceed 100.' })
  capacity: number;

  @IsIn(BUS_STATUSES, { message: `Status must be one of ${BUS_STATUSES.join(', ')}.` })
  status: string;
}
