import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum SexEnum {
  M = 'M',
  F = 'F',
  OTHER = 'OTHER',
}

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsDateString()
  birthDate: string;

  @IsEnum(SexEnum)
  sex: SexEnum;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  curp?: string;
}
