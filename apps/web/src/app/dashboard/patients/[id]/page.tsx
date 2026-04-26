'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { patientsApi, notesApi } from '@/lib/api';
import { format, differenceInYears } from 'date-fns';
import { parseLocalDate } from '@/lib/dates';
import { es } from 'date-fns/locale';
import { Download, Loader2 } from 'lucide-react';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (note: any) => {
    setDownloading(note.id);
    try {
      const typeLabel = note.type === 'INTAKE' ? 'Ingreso' : 'Seguimiento';
      const dateStr = note.consultDate.slice(0, 10);
      await notesApi.download(note.id, `Nota_${typeLabel}_${patient.folio}_${dateStr}.docx`);
    } catch {
      alert('Error al descargar la nota. Intenta de nuevo.');
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    patientsApi.get(id)
      .then(r => setPatient(r.data))
      .catch(() => router.replace('/dashboard/patients'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!patient) return null;

  const age = differenceInYears(new Date(), new Date(patient.birthDate));
  const sexLabel = patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : 'Otro';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <Link href="/dashboard/patients" className="text-sm text-slate-400 hover:text-navy mb-4 inline-block">
        ← Pacientes
      </Link>

      {/* Patient header */}
      <div className="card mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center
                          text-white font-bold text-xl flex-shrink-0">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">{patient.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {patient.folio} · {age} años · {sexLabel}
              {patient.maritalStatus ? ` · ${patient.maritalStatus}` : ''}
            </p>
            {(patient.occupation || patient.phone || patient.address) && (
              <p className="text-xs text-slate-400 mt-0.5">
                {[patient.occupation, patient.phone, patient.address].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              Registrado: {format(new Date(patient.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/notes/new?patientId=${patient.id}&type=${patient.notes.length === 0 ? 'INTAKE' : 'FOLLOWUP'}`}
          className="btn btn-primary flex-shrink-0">
          ✦ Nueva nota
        </Link>
      </div>

      {/* Notes history */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Historial clínico · {patient.notes.length} {patient.notes.length === 1 ? 'nota' : 'notas'}
        </h2>
      </div>

      {patient.notes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📋</p>
          <h3 className="font-semibold text-slate-700">Sin notas clínicas</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">Genera la nota de ingreso para comenzar el expediente</p>
          <Link href={`/dashboard/notes/new?patientId=${patient.id}&type=INTAKE`} className="btn btn-primary">
            ✦ Crear nota de ingreso
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {patient.notes.map((note: any, idx: number) => {
            const isOpen = expandedNote === note.id;
            const isFirst = idx === 0;
            const dxList = Array.isArray(note.diagnoses) ? note.diagnoses : [];

            return (
              <div key={note.id}
                className={`card border transition-all ${isFirst ? 'border-navy/20' : ''}`}>
                {/* Note header */}
                <div className="w-full flex items-center justify-between">
                <button
                  className="flex-1 flex items-center justify-between text-left"
                  onClick={() => setExpandedNote(isOpen ? null : note.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`soap-badge ${
                      note.type === 'INTAKE'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {note.type === 'INTAKE' ? 'Ingreso' : 'Seguimiento'}
                    </span>
                    {isFirst && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Más reciente
                      </span>
                    )}
                    <span className="text-sm text-slate-600">
                      {format(parseLocalDate(note.consultDate), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                  <span className={`text-slate-400 transition-transform text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                <button
                  onClick={() => handleDownload(note)}
                  disabled={downloading === note.id}
                  title="Descargar nota en Word"
                  className="ml-3 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
                             text-slate-500 hover:text-navy border border-slate-200 hover:border-navy/30
                             rounded-lg transition-all cursor-pointer bg-white hover:bg-slate-50
                             disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                  {downloading === note.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Descargar</span>
                </button>
                </div>

                {/* Summary always visible */}
                <p className="text-sm text-slate-500 mt-2 italic">"{note.summary}"</p>

                {/* CIE-10 chips */}
                {dxList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dxList.map((dx: any, i: number) => (
                      <span key={i}
                        className="inline-flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                        <span className="font-bold text-teal">{dx.code || dx.codigo}</span>
                        <span className="text-slate-600">{dx.name || dx.nombre}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded SOAP */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                    {[
                      { key: 'subjective', label: 'S', name: 'Subjetivo', color: 'bg-blue-50 text-blue-800' },
                      { key: 'objective', label: 'O', name: 'Objetivo', color: 'bg-purple-50 text-purple-800' },
                      { key: 'assessment', label: 'A', name: 'Evaluación', color: 'bg-amber-50 text-amber-800' },
                      { key: 'plan', label: 'P', name: 'Plan', color: 'bg-emerald-50 text-emerald-800' },
                    ].map(s => (
                      <div key={s.key} className="flex gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center
                                        font-bold text-sm flex-shrink-0 mt-0.5 ${s.color}`}>
                          {s.label}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                            {s.name}
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">{note[s.key]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
