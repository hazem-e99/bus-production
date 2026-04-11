import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateBusLocationDto {
  @IsNumber()
  busId: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  speed?: number;
}
