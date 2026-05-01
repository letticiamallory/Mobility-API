import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['visual', 'wheelchair', 'reduced_mobility'])
  disability_type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['alone', 'companied', 'both'])
  accompanied?: string;
}
