import { IsNotEmpty, IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CheckRouteDto {
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
}
