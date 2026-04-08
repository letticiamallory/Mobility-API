import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  user_id!: number;

  @IsInt()
  place_id!: number;

  @IsBoolean()
  accessible!: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
}
