import { Controller, Post, Get, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { NotesService } from './notes.service';
import { NoteExporterService } from './note-exporter.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerateNoteDto } from './dto/generate-note.dto';
import { SaveNoteDto } from './dto/save-note.dto';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(
    private notes: NotesService,
    private exporter: NoteExporterService,
  ) {}

  @Post('generate')
  generate(@Request() req: any, @Body() dto: GenerateNoteDto) {
    return this.notes.generate(req.user.sub, dto);
  }

  @Post()
  save(@Request() req: any, @Body() dto: SaveNoteDto) {
    return this.notes.save(req.user.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.notes.findOne(id, req.user.sub);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { note, patient, therapist } = await this.notes.findForExport(id, req.user.sub);
    const buffer = await this.exporter.generateDocx(note, patient, therapist);

    const typeLabel = note.type === 'INTAKE' ? 'Ingreso' : 'Seguimiento';
    const filename = `Nota_${typeLabel}_${patient.folio}_${note.consultDate.toISOString().slice(0, 10)}.docx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
