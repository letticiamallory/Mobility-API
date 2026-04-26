import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ReviewType } from '../review.entity';

export class CreateReviewDto {
  @IsEnum(ReviewType)
  type!: string;

  @IsOptional()
  @IsNumber()
  route_id?: number;

  @IsOptional()
  @IsString()
  station_id?: string;

  @IsOptional()
  @IsString()
  line_id?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  photos?: string[];
}
