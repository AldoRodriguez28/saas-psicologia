import { IsString, IsEnum, IsDateString, IsArray, IsOptional } from 'class-validator';
import { NoteType } from '@prisma/client';

export class SaveNoteDto {
  @IsString()
  patientId: string;

  @IsEnum(NoteType)
  type: NoteType;

  @IsString()
  rawNote: string;

  @IsString()
  subjective: string;

  @IsString()
  objective: string;

  @IsString()
  assessment: string;

  @IsString()
  plan: string;

  @IsString()
  treatment: string;

  @IsString()
  prognosis: string;

  @IsArray()
  diagnoses: object[];

  @IsString()
  summary: string;

  @IsDateString()
  consultDate: string;

  @IsOptional()
  @IsString()
  hora?: string;

  @IsOptional()
  @IsString()
  peso?: string;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsString()
  ta?: string;

  @IsOptional()
  @IsString()
  fc?: string;

  @IsOptional()
  @IsString()
  fr?: string;

  @IsOptional()
  @IsString()
  temperatura?: string;

  @IsOptional()
  @IsString()
  psicometria?: string;

  @IsOptional()
  @IsString()
  historiaPrevia?: string;

  @IsOptional()
  @IsString()
  desarrolloPsicobiologico?: string;
}
