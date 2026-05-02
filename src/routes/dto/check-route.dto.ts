import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CheckRouteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_id!: number;

  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsString()
  @IsNotEmpty()
  transport_type!: string;

  @IsOptional()
  @IsString()
  accompanied?: string;

  @IsOptional()
  @IsString()
  time_filter?: string;

  @IsOptional()
  @IsString()
  time_value?: string;

  @IsOptional()
  @IsString()
  route_preference?: string;
}
