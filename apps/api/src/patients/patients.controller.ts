// patients.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePatientDto } from './dto/create-patient.dto';

@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private patients: PatientsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.patients.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.patients.findOne(id, req.user.sub);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreatePatientDto) {
    return this.patients.create(req.user.sub, dto);
  }

  @Get(':id/context')
  getContext(@Param('id') id: string, @Request() req: any) {
    return this.patients.getNotesForContext(id, req.user.sub);
  }
}
