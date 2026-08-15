import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateBusLocationDto {
  @IsNumber({}, { message: 'Bus ID must be a number.' })
  busId: number;

  @IsNumber({}, { message: 'Latitude must be a number.' })
  @Min(-90, { message: 'Latitude must be between -90 and 90.' })
  @Max(90, { message: 'Latitude must be between -90 and 90.' })
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a number.' })
  @Min(-180, { message: 'Longitude must be between -180 and 180.' })
  @Max(180, { message: 'Longitude must be between -180 and 180.' })
  longitude: number;

  @IsNumber({}, { message: 'Speed must be a number.' })
  @IsOptional()
  @Min(0, { message: 'Speed cannot be negative.' })
  speed?: number;
}
