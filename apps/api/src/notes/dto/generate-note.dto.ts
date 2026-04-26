// generate-note.dto.ts
import { IsString, IsEnum, IsDateString } from 'class-validator';
import { NoteType } from '@prisma/client';

export class GenerateNoteDto {
  @IsString()
  patientId: string;

  @IsEnum(NoteType)
  type: NoteType;

  @IsString()
  rawNote: string;

  @IsDateString()
  consultDate: string;
}
