import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CheckRouteDto {
  @IsInt()
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
}
