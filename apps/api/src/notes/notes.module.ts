import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NoteExporterService } from './note-exporter.service';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [PatientsModule],
  controllers: [NotesController],
  providers: [NotesService, NoteExporterService],
})
export class NotesModule {}
