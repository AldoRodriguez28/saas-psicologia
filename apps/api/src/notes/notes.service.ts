import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { GenerateNoteDto } from './dto/generate-note.dto';
import { SaveNoteDto } from './dto/save-note.dto';
import { NoteType } from '@prisma/client';

// Pricing as of claude-sonnet-4 (USD per million tokens)
const PRICE_INPUT_PER_M  = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;
const PRICE_CACHE_READ_PER_M = 0.30;   // 90 % cheaper than input
const PRICE_CACHE_WRITE_PER_M = 3.75;  // 25 % more expensive than input (one-time)

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);
  private anthropic: Anthropic | null = null;

  constructor(
    private prisma: PrismaService,
    private patients: PatientsService,
  ) {}

  private getAnthropic(): Anthropic {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'Falta ANTHROPIC_API_KEY en la configuración del servidor (p. ej. en apps/api/.env). Añade tu clave de api.anthropic.com y reinicia la API.',
      );
    }
    if (!this.anthropic) {
      this.anthropic = new Anthropic({ apiKey: key });
    }
    return this.anthropic;
  }

  private rethrowAnthropicError(err: unknown): never {
    if (!(err instanceof APIError)) throw err;
    const text = NotesService.extractAnthropicMessage(err);
    if (/credit balance is too low|too low to access|insufficient credit/i.test(text)) {
      throw new ServiceUnavailableException(
        'El saldo de créditos de Anthropic es insuficiente. En https://console.anthropic.com abre «Plans & Billing» para añadir créditos o activar un plan de pago.',
      );
    }
    if (err.status === 429 || /rate limit/i.test(text)) {
      throw new ServiceUnavailableException(
        'Límite de peticiones a Anthropic. Espera unos minutos o revisa el plan de uso en console.anthropic.com.',
      );
    }
    throw new BadRequestException(
      `No se pudo generar con la IA: ${text}`.replace(/\s+/g, ' ').trim().slice(0, 400),
    );
  }

  private static extractAnthropicMessage(err: InstanceType<typeof APIError>): string {
    const body = err.error as { error?: { message?: string } } | undefined;
    return (body?.error?.message as string) || err.message;
  }

  // ── Generate SOAP note using Claude with patient history context
  async generate(userId: string, dto: GenerateNoteDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (patient.userId !== userId) throw new ForbiddenException();

    const age = Math.floor(
      (Date.now() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    );

    let historyContext = '';
    if (dto.type === NoteType.FOLLOWUP) {
      const prevNotes = await this.patients.getNotesForContext(dto.patientId, userId, 3);
      if (prevNotes.length === 0) {
        throw new BadRequestException(
          'No hay notas anteriores para este paciente. Usa "Ingreso" para la primera consulta.',
        );
      }
      historyContext = prevNotes
        .map((n, i) => {
          const fecha = new Date(n.consultDate).toLocaleDateString('es-MX');
          const tipo = n.type === 'INTAKE' ? 'Ingreso' : 'Seguimiento';
          return `--- Consulta ${i + 1} (${tipo} · ${fecha}) ---\nS: ${n.subjective}\nO: ${n.objective}\nA: ${n.assessment}\nP: ${n.plan}\nResumen: ${n.summary}`;
        })
        .join('\n\n');
    }

    const { systemPrompt, userPrompt } = this.buildPrompt({
      type: dto.type,
      rawNote: dto.rawNote,
      patientName: patient.name,
      age,
      sex: patient.sex,
      consultDate: dto.consultDate,
      historyContext,
    });

    // ── Call Claude with prompt caching on the static system prompt
    let message: Anthropic.Message;
    try {
      message = await this.getAnthropic().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      }) as Anthropic.Message;
    } catch (err) {
      this.rethrowAnthropicError(err);
    }

    // ── Capture token usage & persist to DB (fire-and-forget; never blocks the response)
    const usage = message.usage as {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };

    const cachedWriteTokens = usage.cache_creation_input_tokens ?? 0;
    const cachedReadTokens  = usage.cache_read_input_tokens     ?? 0;
    const billableInput     = usage.input_tokens; // already excludes cache reads
    const costUsd =
      (billableInput     / 1_000_000) * PRICE_INPUT_PER_M  +
      (usage.output_tokens / 1_000_000) * PRICE_OUTPUT_PER_M +
      (cachedWriteTokens / 1_000_000) * PRICE_CACHE_WRITE_PER_M +
      (cachedReadTokens  / 1_000_000) * PRICE_CACHE_READ_PER_M;

    this.logger.log({
      event: 'ai_note_generated',
      userId,
      patientId: dto.patientId,
      noteType: dto.type,
      model: message.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_creation_tokens: cachedWriteTokens,
      cache_read_tokens: cachedReadTokens,
      estimated_usd: costUsd.toFixed(6),
    });

    this.prisma.usageLog
      .create({
        data: {
          userId,
          noteType: dto.type as NoteType,
          model: message.model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cachedTokens: cachedReadTokens,
          costUsd: costUsd.toFixed(8),
        },
      })
      .catch((err: unknown) =>
        this.logger.error('Failed to persist UsageLog', err),
      );

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('');

    return this.parseAIResponse(rawText);
  }

  // ── Save a validated note to the DB
  async save(userId: string, dto: SaveNoteDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (patient.userId !== userId) throw new ForbiddenException();

    const STANDARD_PLAN_ITEMS =
      '\n\nIndicaciones generales:\n' +
      '• Orientación alimentaria\n' +
      '• Apego a tratamiento\n' +
      '• Evitar consumo de sustancias\n' +
      '• Acudir a centro de salud para recibir atención integral';

    const note = await this.prisma.note.create({
      data: {
        patientId: dto.patientId,
        type: dto.type as NoteType,
        rawNote: dto.rawNote,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        treatment: dto.treatment ?? '',
        prognosis: dto.prognosis ?? '',
        plan: dto.plan + STANDARD_PLAN_ITEMS,
        diagnoses: dto.diagnoses,
        summary: dto.summary,
        consultDate: new Date(dto.consultDate),
        hora: dto.hora ?? '',
        peso: dto.peso ?? '',
        talla: dto.talla ?? '',
        ta: dto.ta ?? '',
        fc: dto.fc ?? '',
        fr: dto.fr ?? '',
        temperatura: dto.temperatura ?? '',
        psicometria: dto.psicometria ?? '',
        historiaPrevia: dto.historiaPrevia ?? '',
        desarrolloPsicobiologico: dto.desarrolloPsicobiologico ?? '',
        allergies: dto.allergies ?? '',
        nextAppointment: dto.nextAppointment ?? '',
        medications: dto.medications ?? [],
        familyMembers: dto.familyMembers ?? [],
        hamAScore: dto.hamAScore ?? 0,
        hamDScore: dto.hamDScore ?? 0,
      },
    });

    await this.prisma.patient.update({
      where: { id: dto.patientId },
      data: { updatedAt: new Date() },
    });

    return note;
  }

  async findOne(id: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!note) throw new NotFoundException();
    if (note.patient.userId !== userId) throw new ForbiddenException();
    return note;
  }

  async findForExport(id: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!note) throw new NotFoundException();
    if (note.patient.userId !== userId) throw new ForbiddenException();

    const therapist = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, cedula: true, institution: true },
    });

    return { note, patient: note.patient, therapist };
  }

  // ── Prompt builder — splits static system prompt (cacheable) from dynamic user prompt
  private buildPrompt(params: {
    type: NoteType;
    rawNote: string;
    patientName: string;
    age: number;
    sex: string;
    consultDate: string;
    historyContext: string;
  }): { systemPrompt: string; userPrompt: string } {
    const tipoNota =
      params.type === NoteType.INTAKE
        ? 'NOTA DE INGRESO (primera consulta)'
        : 'NOTA DE SEGUIMIENTO (consulta subsecuente)';

    const sexLabel =
      params.sex === 'M' ? 'Masculino' : params.sex === 'F' ? 'Femenino' : 'No especificado';

    // Static portion → goes into system with cache_control (never changes between requests)
    const systemPrompt = `Eres una psicóloga clínica experta redactando notas para expediente clínico oficial en México.

INSTRUCCIONES CRÍTICAS:
Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después. Sin backticks. Sin markdown.
Cada valor de texto debe ser una cadena en una sola línea, sin saltos de línea internos.
Máximo 3 oraciones por campo SOAP.

ESQUEMA REQUERIDO:
{"subjective":"texto","objective":"texto","assessment":"texto","treatment":"texto","prognosis":"texto","plan":"texto","diagnoses":[{"code":"F41.1","name":"nombre diagnóstico","detail":"especificación"}],"summary":"una oración"}

REGLAS DE CADA CAMPO:
- subjective: síntomas y motivo de consulta referidos por el paciente en sus propias palabras
- objective: hallazgos clínicos observados por el terapeuta y escalas aplicadas con resultados
- assessment: impresión diagnóstica con razonamiento clínico y códigos CIE-10
- treatment: intervenciones terapéuticas aplicadas en esta sesión (técnicas, psicoeducación, terapia usada)
- prognosis: pronóstico clínico basado en factores protectores, de riesgo y respuesta al tratamiento
- plan: próximos pasos acordados con el paciente para la siguiente sesión
- diagnoses: 1 a 3 diagnósticos CIE-10 relevantes
- summary: una oración para el historial del expediente
- NO uses comillas dobles dentro de los valores de texto`;

    // Dynamic portion → per-request data
    const historialSection =
      params.type === NoteType.FOLLOWUP && params.historyContext
        ? `\nCONTEXTO DE CONSULTAS ANTERIORES (usa esto para dar continuidad a la nota, menciona explícitamente la evolución en el campo "assessment"):\n${params.historyContext}\n`
        : '';

    const userPrompt = `DATOS DEL PACIENTE:
- Nombre: ${params.patientName}
- Edad: ${params.age} años
- Sexo: ${sexLabel}
- Fecha de consulta: ${params.consultDate}
- Tipo de nota: ${tipoNota}
${historialSection}
NOTA LIBRE DE LA CONSULTA:
${params.rawNote}`;

    return { systemPrompt, userPrompt };
  }

  // ── Robust JSON parser with fallback field extraction
  private parseAIResponse(raw: string) {
    let clean = raw.replace(/```json|```/g, '').trim();

    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new BadRequestException('La IA no devolvió un formato válido. Intenta de nuevo.');
    }
    clean = clean.substring(start, end + 1);

    clean = clean.replace(/:\s*"([\s\S]*?)"/g, (_match, val: string) => {
      const sanitized = val
        .replace(/\n/g, ' ')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim();
      return `: "${sanitized}"`;
    });

    try {
      return JSON.parse(clean);
    } catch {
      const extract = (field: string) => {
        const m = clean.match(new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`));
        return m ? m[1] : '';
      };

      const dxMatch = clean.match(/"diagnoses"\s*:\s*\[([\s\S]*?)\]/);
      let diagnoses: any[] = [];
      if (dxMatch) {
        const items = dxMatch[1].match(/\{[^}]+\}/g) || [];
        diagnoses = items.map((item) => ({
          code: (item.match(/"code"\s*:\s*"([^"]*)"/) || [])[1] || '',
          name: (item.match(/"name"\s*:\s*"([^"]*)"/) || [])[1] || '',
          detail: (item.match(/"detail"\s*:\s*"([^"]*)"/) || [])[1] || '',
        }));
      }

      const result = {
        subjective: extract('subjective'),
        objective: extract('objective'),
        assessment: extract('assessment'),
        treatment: extract('treatment'),
        prognosis: extract('prognosis'),
        plan: extract('plan'),
        diagnoses,
        summary: extract('summary'),
      };

      if (!result.subjective) {
        throw new BadRequestException('No se pudo procesar la respuesta de la IA. Intenta de nuevo.');
      }

      return result;
    }
  }
}
