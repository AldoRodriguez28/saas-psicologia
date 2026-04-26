import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.patient.findMany({
      where: { userId },
      include: {
        _count: { select: { notes: true } },
        notes: {
          orderBy: { consultDate: 'desc' },
          take: 1,
          select: { consultDate: true, type: true, summary: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { consultDate: 'desc' },
          select: {
            id: true,
            type: true,
            consultDate: true,
            summary: true,
            diagnoses: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
          },
        },
      },
    });

    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (patient.userId !== userId) throw new ForbiddenException();

    return patient;
  }

  async create(userId: string, dto: CreatePatientDto) {
    // Auto-generate folio: PSI-YYYY-XXXX
    const count = await this.prisma.patient.count({ where: { userId } });
    const folio = `PSI-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.patient.create({
      data: {
        userId,
        folio,
        name: dto.name,
        birthDate: new Date(dto.birthDate),
        sex: dto.sex as any,
        phone: dto.phone ?? '',
        address: dto.address ?? '',
        maritalStatus: dto.maritalStatus ?? '',
        occupation: dto.occupation ?? '',
        curp: dto.curp ?? '',
        birthPlace: dto.birthPlace ?? '',
        guardian: dto.guardian ?? '',
        guardianRelation: dto.guardianRelation ?? '',
        referredBy: dto.referredBy ?? '',
        interrogatorio: dto.interrogatorio ?? '',
        insurance: dto.insurance ?? '',
        insuranceNumber: dto.insuranceNumber ?? '',
      },
    });
  }

  // Returns last N notes for context injection into AI prompt
  async getNotesForContext(patientId: string, userId: string, limit = 3) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.userId !== userId) throw new ForbiddenException();

    return this.prisma.note.findMany({
      where: { patientId },
      orderBy: { consultDate: 'desc' },
      take: limit,
      select: {
        type: true,
        consultDate: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        diagnoses: true,
        summary: true,
      },
    });
  }
}
