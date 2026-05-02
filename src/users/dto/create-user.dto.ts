import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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
  confirm_password!: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsString()
  @IsNotEmpty()
  disability_type!: string;
}
