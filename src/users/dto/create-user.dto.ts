import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const USER_ACCOMPANIED_VALUES = [
  'alone',
  'accompanied',
  'both',
] as const;

export type UserAccompanied = (typeof USER_ACCOMPANIED_VALUES)[number];

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  disability_type!: string;

  /** JSON field name: `accompanied` (DB column: `users.accompanied`). */
  @IsOptional()
  @IsString()
  @IsIn([...USER_ACCOMPANIED_VALUES])
  accompanied?: UserAccompanied;
}
