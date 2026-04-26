'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { patientsApi, notesApi } from '@/lib/api';
import { format, differenceInYears } from 'date-fns';
import { parseLocalDate } from '@/lib/dates';
import { es } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';

type Step = 'patient' | 'form' | 'review' | 'saved';

const STANDARD_PLAN_SUFFIX =
  '\n\nIndicaciones generales:\n' +
  '• Orientación alimentaria\n' +
  '• Apego a tratamiento\n' +
  '• Evitar consumo de sustancias\n' +
  '• Acudir a centro de salud para recibir atención integral';

interface GeneratedNote {
  subjective: string;
  objective: string;
  assessment: string;
  treatment: string;
  prognosis: string;
  plan: string;
  diagnoses: { code: string; name: string; detail: string }[];
  summary: string;
  psicometria: string;
  historiaPrevia: string;
  desarrolloPsicobiologico: string;
}

interface VitalSigns {
  hora: string; peso: string; talla: string;
  ta: string; fc: string; fr: string; temperatura: string;
}

const EMPTY_VITALS: VitalSigns = { hora: '', peso: '', talla: '', ta: '', fc: '', fr: '', temperatura: '' };

const SOAP_FIELDS = [
  { key: 'subjective',  label: 'S',  name: 'Subjetivo',    color: 'bg-blue-50 text-blue-700',     border: 'border-blue-200' },
  { key: 'objective',   label: 'O',  name: 'Objetivo',     color: 'bg-purple-50 text-purple-700',  border: 'border-purple-200' },
  { key: 'assessment',  label: 'A',  name: 'Diagnóstico',  color: 'bg-amber-50 text-amber-700',    border: 'border-amber-200' },
  { key: 'treatment',   label: 'T',  name: 'Tratamiento',  color: 'bg-rose-50 text-rose-700',      border: 'border-rose-200' },
  { key: 'prognosis',   label: 'Px', name: 'Pronóstico',   color: 'bg-slate-50 text-slate-700',    border: 'border-slate-200' },
  { key: 'plan',        label: 'P',  name: 'Plan',         color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
];

export default function NewNotePage() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep]                     = useState<Step>('patient');
  const [patients, setPatients]             = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [search, setSearch]                 = useState('');
  const [noteType, setNoteType]             = useState<'INTAKE' | 'FOLLOWUP'>('INTAKE');
  const [rawNote, setRawNote]               = useState('');
  const [consultDate, setConsultDate]       = useState(new Date().toISOString().split('T')[0]);
  const [vitals, setVitals]                 = useState<VitalSigns>(EMPTY_VITALS);
  const [showVitals, setShowVitals]         = useState(false);
  const [generated, setGenerated]           = useState<GeneratedNote | null>(null);
  const [edited, setEdited]                 = useState<GeneratedNote | null>(null);
  const [generating, setGenerating]         = useState(false);
  const [genError, setGenError]             = useState('');
  const [savedId, setSavedId]               = useState<string | null>(null);

  useEffect(() => {
    patientsApi.list().then(r => {
      setPatients(r.data);
      const pid  = params.get('patientId');
      const type = params.get('type') as 'INTAKE' | 'FOLLOWUP' | null;
      if (pid) {
        const p = r.data.find((x: any) => x.id === pid);
        if (p) { setSelectedPatient(p); setStep('form'); }
      }
      if (type) setNoteType(type);
    });
  }, []);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.folio.toLowerCase().includes(search.toLowerCase())
  );

  const selectPatient = (p: any) => {
    setSelectedPatient(p);
    setNoteType(p._count?.notes === 0 ? 'INTAKE' : 'FOLLOWUP');
    setStep('form');
  };

  const handleGenerate = async () => {
    if (!rawNote.trim()) return;
    setGenerating(true); setGenError('');
    try {
      const { data } = await notesApi.generate({
        patientId: selectedPatient.id, type: noteType, rawNote, consultDate,
      });
      const withDefaults: GeneratedNote = {
        ...data,
        treatment: data.treatment || '',
        prognosis: data.prognosis || '',
        plan: (data.plan || '') + STANDARD_PLAN_SUFFIX,
        psicometria: data.psicometria || '',
        historiaPrevia: data.historiaPrevia || '',
        desarrolloPsicobiologico: data.desarrolloPsicobiologico || '',
      };
      setGenerated(withDefaults);
      setEdited({ ...withDefaults });
      setStep('review');
    } catch (err: any) {
      setGenError(err?.response?.data?.message || 'Error al generar la nota. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!edited) return;
    try {
      const planWithoutSuffix = edited.plan.replace(STANDARD_PLAN_SUFFIX, '').trim();
      const { data } = await notesApi.save({
        patientId: selectedPatient.id, type: noteType, rawNote, consultDate,
        ...edited,
        plan: planWithoutSuffix,
        ...vitals,
      });
      setSavedId(data.id);
      setStep('saved');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al guardar');
    }
  };

  const updateField = (field: keyof GeneratedNote, value: string) =>
    setEdited(e => e ? { ...e, [field]: value } : e);

  const setVital = (k: keyof VitalSigns) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVitals(v => ({ ...v, [k]: e.target.value }));

  const age = selectedPatient
    ? differenceInYears(new Date(), new Date(selectedPatient.birthDate))
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-navy">← Inicio</Link>
        <span className="text-slate-200">/</span>
        <span className="text-sm text-slate-600 font-medium">Nueva nota clínica</span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { id: 'patient', label: '1. Paciente' },
          { id: 'form',    label: '2. Consulta' },
          { id: 'review',  label: '3. Revisar' },
        ].map((s, i, arr) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
              step === s.id
                ? 'bg-navy text-white'
                : (['review','saved'].includes(step) && s.id === 'patient') || (step === 'review' && s.id === 'form')
                  ? 'bg-teal/20 text-teal'
                  : 'bg-slate-100 text-slate-400'
            }`}>
              {((['review','saved'].includes(step) && s.id !== 'review') || (step === 'review' && s.id === 'form')) ? '✓ ' : ''}{s.label}
            </div>
            {i < arr.length - 1 && <div className="w-6 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Select patient ── */}
      {step === 'patient' && (
        <div>
          <h2 className="text-xl font-bold text-navy mb-1">¿Para qué paciente?</h2>
          <p className="text-sm text-slate-500 mb-5">Selecciona un paciente existente o registra uno nuevo.</p>
          <div className="flex gap-3 mb-4">
            <input className="input flex-1" placeholder="Buscar por nombre o folio…"
              value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            <Link href="/dashboard/patients/new" className="btn btn-secondary whitespace-nowrap">+ Nuevo</Link>
          </div>
          <div className="space-y-2">
            {filteredPatients.length === 0 && (
              <div className="card text-center py-8 text-slate-400 text-sm">
                {search ? 'Sin resultados' : 'No hay pacientes registrados aún'}
              </div>
            )}
            {filteredPatients.map(p => {
              const a = differenceInYears(new Date(), new Date(p.birthDate));
              return (
                <button key={p.id} onClick={() => selectPatient(p)}
                  className="card w-full flex items-center justify-between text-left hover:border-navy transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-navy/8 flex items-center justify-center text-navy font-bold text-sm flex-shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-navy">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.folio} · {a} años · {p._count.notes} notas</p>
                    </div>
                  </div>
                  <span className={`soap-badge text-xs flex-shrink-0 ${p._count.notes === 0 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p._count.notes === 0 ? 'Ingreso' : 'Seguimiento'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: Note form ── */}
      {step === 'form' && selectedPatient && (
        <div>
          {/* Patient chip */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-navy/4 rounded-xl border border-navy/10">
            <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {selectedPatient.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-navy">{selectedPatient.name}</p>
              <p className="text-xs text-slate-400">{selectedPatient.folio} · {age} años</p>
            </div>
            <button onClick={() => setStep('patient')} className="text-xs text-slate-400 hover:text-navy">cambiar</button>
          </div>

          {/* Note type */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(['INTAKE', 'FOLLOWUP'] as const).map(t => (
              <button key={t} onClick={() => setNoteType(t)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${noteType === t ? 'border-navy bg-navy/4' : 'border-slate-200 hover:border-slate-400'}`}>
                <p className="font-semibold text-sm text-navy">{t === 'INTAKE' ? '🔵 Nota de ingreso' : '🟢 Nota de seguimiento'}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t === 'INTAKE' ? 'Primera consulta' : 'Consulta subsecuente'}
                </p>
              </button>
            ))}
          </div>

          {/* Date */}
          <div className="mb-5">
            <label className="label">Fecha de consulta</label>
            <input className="input max-w-xs" type="date" value={consultDate} onChange={e => setConsultDate(e.target.value)} />
          </div>

          {/* ── Signos vitales (colapsable) ── */}
          <div className="mb-5 border border-slate-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowVitals(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium
                         text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="text-base">🩺</span> Signos vitales y somatometría
                <span className="text-xs text-slate-400 font-normal">(opcional)</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showVitals ? 'rotate-180' : ''}`} />
            </button>

            {showVitals && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="label text-xs">Hora</label>
                    <input className="input text-sm" type="time" value={vitals.hora} onChange={setVital('hora')} />
                  </div>
                  <div>
                    <label className="label text-xs">Peso (kg)</label>
                    <input className="input text-sm" placeholder="70" value={vitals.peso} onChange={setVital('peso')} />
                  </div>
                  <div>
                    <label className="label text-xs">Talla (m)</label>
                    <input className="input text-sm" placeholder="1.70" value={vitals.talla} onChange={setVital('talla')} />
                  </div>
                  <div>
                    <label className="label text-xs">T°C</label>
                    <input className="input text-sm" placeholder="36.5" value={vitals.temperatura} onChange={setVital('temperatura')} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">TA (mmHg)</label>
                    <input className="input text-sm" placeholder="120/80" value={vitals.ta} onChange={setVital('ta')} />
                  </div>
                  <div>
                    <label className="label text-xs">FC (x/min)</label>
                    <input className="input text-sm" placeholder="72" value={vitals.fc} onChange={setVital('fc')} />
                  </div>
                  <div>
                    <label className="label text-xs">FR (x/min)</label>
                    <input className="input text-sm" placeholder="16" value={vitals.fr} onChange={setVital('fr')} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Raw note */}
          <div className="mb-5">
            <label className="label">Nota libre de la consulta</label>
            <p className="text-xs text-slate-400 mb-2">
              Escribe tal como tomas tus notas. La IA estructurará el SOAP automáticamente.
            </p>
            <textarea
              className="w-full min-h-44 p-4 border border-slate-200 rounded-xl text-sm leading-relaxed
                         focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy-light resize-y transition-all"
              placeholder="Ejemplo: paciente refiere dificultad para dormir y tensión muscular, escala GAD-7 resultado 8 puntos…"
              value={rawNote} onChange={e => setRawNote(e.target.value)} autoFocus />
            <p className="text-right text-xs text-slate-300 mt-1">{rawNote.length} caracteres</p>
          </div>

          {genError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg mb-4">{genError}</p>
          )}

          <button onClick={handleGenerate} disabled={generating || !rawNote.trim()}
            className="btn btn-primary w-full justify-center h-12 text-base">
            {generating
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generando nota SOAP…</span>
              : '✦ Generar nota SOAP con IA'}
          </button>

          {generating && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-2">
                {['Analizando nota libre','Estructurando SOAP','Asignando códigos CIE-10','Redactando nota final'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-navy/30 animate-pulse" />{s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Review & edit ── */}
      {step === 'review' && edited && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-navy">Nota generada · revisión</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {selectedPatient.name} · {format(parseLocalDate(consultDate), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            <span className={`soap-badge ${noteType === 'INTAKE' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {noteType === 'INTAKE' ? 'Ingreso' : 'Seguimiento'}
            </span>
          </div>

          <p className="text-xs text-teal bg-teal/8 border border-teal/20 px-3 py-2 rounded-lg mb-5">
            ✎ Todos los campos son editables. Haz clic en el texto para corregir antes de guardar.
          </p>

          {/* ── Signos vitales resumen (si hay datos) ── */}
          {(vitals.peso || vitals.ta || vitals.fc || vitals.hora) && (
            <div className="card mb-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Signos vitales registrados</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {vitals.hora      && <span>Hora: <strong>{vitals.hora}</strong></span>}
                {vitals.peso      && <span>Peso: <strong>{vitals.peso} kg</strong></span>}
                {vitals.talla     && <span>Talla: <strong>{vitals.talla} m</strong></span>}
                {vitals.ta        && <span>TA: <strong>{vitals.ta} mmHg</strong></span>}
                {vitals.fc        && <span>FC: <strong>{vitals.fc} x/min</strong></span>}
                {vitals.fr        && <span>FR: <strong>{vitals.fr} x/min</strong></span>}
                {vitals.temperatura && <span>T°C: <strong>{vitals.temperatura}</strong></span>}
              </div>
            </div>
          )}

          {/* SOAP + Treatment + Prognosis + Plan */}
          <div className="space-y-3 mb-5">
            {SOAP_FIELDS.map(f => (
              <div key={f.key} className={`rounded-xl border ${f.border} overflow-hidden`}>
                <div className={`flex items-center gap-2 px-4 py-2 ${f.color}`}>
                  <span className="font-bold text-sm">{f.label}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{f.name}</span>
                </div>
                <textarea className="w-full p-4 text-sm leading-relaxed text-slate-700 focus:outline-none resize-y min-h-20 bg-white"
                  value={(edited as any)[f.key]}
                  onChange={e => updateField(f.key as keyof GeneratedNote, e.target.value)} />
              </div>
            ))}
          </div>

          {/* ── Historia previa + Desarrollo psicobiológico (solo Ingreso) ── */}
          {noteType === 'INTAKE' && (
            <div className="space-y-3 mb-5">
              <div className="rounded-xl border border-indigo-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-800">
                  <span className="font-bold text-sm">HP</span>
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Historia previa</span>
                </div>
                <textarea className="w-full p-4 text-sm leading-relaxed text-slate-700 focus:outline-none resize-y min-h-24 bg-white"
                  placeholder="Antecedentes familiares, personales, escolares, laborales y sexuales relevantes…"
                  value={edited.historiaPrevia}
                  onChange={e => updateField('historiaPrevia', e.target.value)} />
              </div>

              <div className="rounded-xl border border-cyan-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-800">
                  <span className="font-bold text-sm">DP</span>
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Desarrollo psicobiológico</span>
                </div>
                <textarea className="w-full p-4 text-sm leading-relaxed text-slate-700 focus:outline-none resize-y min-h-24 bg-white"
                  placeholder="Gestación, nacimiento, desarrollo motor, lenguaje, control de esfínteres, accidentes…"
                  value={edited.desarrolloPsicobiologico}
                  onChange={e => updateField('desarrolloPsicobiologico', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Psicometría ── */}
          <div className="rounded-xl border border-teal/30 overflow-hidden mb-5">
            <div className="flex items-center gap-2 px-4 py-2 bg-teal/8 text-teal">
              <span className="font-bold text-sm">Psi</span>
              <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Psicometría / Clinimetría</span>
            </div>
            <textarea className="w-full p-4 text-sm leading-relaxed text-slate-700 focus:outline-none resize-y min-h-16 bg-white"
              placeholder="Escalas aplicadas, puntajes y resultados (HAM-A, HAM-D, GAD-7, PHQ-9, CDI, etc.)"
              value={edited.psicometria}
              onChange={e => updateField('psicometria', e.target.value)} />
          </div>

          {/* Diagnoses */}
          <div className="card mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Diagnósticos CIE-10</p>
            <div className="space-y-2">
              {edited.diagnoses.map((dx, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <span className="font-bold text-sm text-teal min-w-12">{dx.code}</span>
                  <span className="text-sm text-slate-700 flex-1">{dx.name}</span>
                  {dx.detail && <span className="text-xs text-slate-400 italic">{dx.detail}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <label className="label">Resumen para historial</label>
            <input className="input" value={edited.summary}
              onChange={e => updateField('summary', e.target.value)} />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} className="btn btn-primary flex-1 justify-center h-11 text-sm">
              💾 Guardar en expediente
            </button>
            <button onClick={() => setStep('form')} className="btn btn-secondary">← Volver</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Saved ── */}
      {step === 'saved' && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h2 className="text-xl font-bold text-navy mb-2">Nota guardada</h2>
          <p className="text-sm text-slate-500 mb-8">La nota fue añadida al expediente de {selectedPatient?.name}.</p>
          <div className="flex gap-3 justify-center">
            <Link href={`/dashboard/patients/${selectedPatient?.id}`} className="btn btn-primary">Ver expediente</Link>
            <button onClick={() => {
              setStep('patient'); setSelectedPatient(null);
              setRawNote(''); setGenerated(null); setEdited(null);
              setVitals(EMPTY_VITALS); setShowVitals(false);
            }} className="btn btn-secondary">Nueva nota</button>
          </div>
        </div>
      )}
    </div>
  );
}
