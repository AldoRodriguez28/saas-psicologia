import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NoteType } from '@prisma/client';

const execFileAsync = promisify(execFile);

// Ruta a la plantilla y al script Python (relativos al directorio raíz del proyecto)
const ASSETS_DIR    = join(__dirname, '..', '..', 'assets');
const TEMPLATE_PATH = join(ASSETS_DIR, 'nota-template.docx');
const SCRIPT_PATH   = join(ASSETS_DIR, 'fill-template.py');

@Injectable()
export class NoteExporterService {
  private readonly logger = new Logger(NoteExporterService.name);

  async generateDocx(note: any, patient: any, therapist: any): Promise<Buffer> {
    const age = differenceInYears(new Date(), new Date(patient.birthDate));
    const sexLabel = patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : 'No especificado';

    // Usar mediodía local para evitar desfase de timezone en format()
    const consultDate = new Date(
      new Date(note.consultDate).toISOString().slice(0, 10) + 'T12:00:00',
    );
    const consultDateStr = format(consultDate, "d 'de' MMMM 'de' yyyy", { locale: es });
    const birthDateStr   = format(
      new Date(new Date(patient.birthDate).toISOString().slice(0, 10) + 'T12:00:00'),
      "d 'de' MMMM 'de' yyyy",
      { locale: es },
    );

    const diagnoses: { code: string; name: string; detail?: string }[] =
      Array.isArray(note.diagnoses) ? note.diagnoses : [];

    // Construir texto de impresión diagnóstica completa con códigos CIE-10
    const dxLines = diagnoses
      .map(d => `${d.code} – ${d.name}${d.detail ? ` (${d.detail})` : ''}`)
      .join('\n');

    const impresionDx = note.assessment
      + (dxLines ? `\n\nDiagnósticos CIE-10:\n${dxLines}` : '')
      + (note.prognosis ? `\n\nPronóstico:\n${note.prognosis}` : '');

    const planContent = (note.treatment ? `Tratamiento:\n${note.treatment}\n\n` : '')
      + `Plan:\n${note.plan}`;

    // Campos del formulario → bookmarks del documento original
    const fields: Record<string, string> = {
      // ── Identificación ──────────────────────────────────────────────────
      Exp:             patient.folio,
      Nombre:          patient.name,
      Edad:            `${age} años`,
      Sexo:            sexLabel,
      FechaCita:       consultDateStr,
      'Fecha Cita':    consultDateStr,
      FechaNacimiento: birthDateStr,
      'Fecha nacimiento': birthDateStr,
      Hora:            note.hora || '',
      Peso:            note.peso  ? `${note.peso} kg`  : '',
      Talla:           note.talla ? `${note.talla} m`  : '',
      IMC:             '',
      TA:              note.ta    || '',
      FC:              note.fc    || '',
      FR:              note.fr    || '',
      T:               note.temperatura || '',
      Teléfono:        patient.phone    || '',
      Domicilio:       patient.address  || '',
      EstadoCivil:     patient.maritalStatus || '',

      // ── Secciones SOAP ───────────────────────────────────────────────────
      ExamentMental:           note.objective,
      MotivoConsulta:          note.subjective,
      ImpresionDiagnostica:    impresionDx,
      Psicometria:             note.psicometria || '—',
      DiagnosticoDiferencial:  dxLines || '—',

      // Solo en Ingreso
      ...(note.type === NoteType.INTAKE
        ? {
            HistoriaPrevia:           note.historiaPrevia           || '(Por completar)',
            DesarrolloPsicobiologico: note.desarrolloPsicobiologico || '(Por completar)',
          }
        : {}),

      // Diagnósticos individuales (para las celdas de tabla)
      PuntajeA:    diagnoses[0]?.code ?? '',
      DiagnosticoA: diagnoses[0]
        ? `${diagnoses[0].name}${diagnoses[0].detail ? ' – ' + diagnoses[0].detail : ''}`
        : '',
      PuntajeB:    diagnoses[1]?.code ?? '',
      DiagnosticoB: diagnoses[1]
        ? `${diagnoses[1].name}${diagnoses[1].detail ? ' – ' + diagnoses[1].detail : ''}`
        : '',

      Plan: planContent,
    };

    // Archivo de salida temporal
    const tmpDir    = await mkdtemp(join(tmpdir(), 'nota-'));
    const outPath   = join(tmpDir, 'nota.docx');

    try {
      const { stdout, stderr } = await execFileAsync('python3', [
        SCRIPT_PATH,
        TEMPLATE_PATH,
        outPath,
        JSON.stringify(fields),
      ]);

      if (stderr) this.logger.warn('fill-template stderr:', stderr);
      if (!stdout.trim().startsWith('OK')) {
        throw new Error(`fill-template returned: ${stdout}`);
      }

      const buffer = await readFile(outPath);
      return buffer;
    } catch (err: any) {
      this.logger.error('Error generando DOCX desde plantilla', err);
      throw new InternalServerErrorException(
        'No se pudo generar el documento. Verifica que Python3 esté instalado.',
      );
    } finally {
      await unlink(outPath).catch(() => null);
    }
  }
}
