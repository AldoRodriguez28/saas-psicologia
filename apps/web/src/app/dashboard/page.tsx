'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { patientsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dates';
import { es } from 'date-fns/locale';
import { Users, FilePen, UserPlus, ChevronRight, FileText, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientsApi.list()
      .then(r => setPatients(r.data))
      .finally(() => setLoading(false));
  }, []);

  const totalNotas = patients.reduce((acc, p) => acc + (p._count?.notes || 0), 0);
  const recientes = patients.slice(0, 5);

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Buen día, {firstName}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-navy/8 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-navy" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Pacientes</p>
            <p className="text-3xl font-bold text-navy mt-0.5 leading-none">{patients.length}</p>
          </div>
        </div>
        <div className="card flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-teal" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Notas clínicas</p>
            <p className="text-3xl font-bold text-teal mt-0.5 leading-none">{totalNotas}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link href="/dashboard/notes/new"
          className="card hover:shadow-card-hover hover:border-navy/30 transition-all
                     cursor-pointer group flex flex-col gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy/8 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-navy" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-navy transition-colors">
              Nueva nota
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Generar nota SOAP con IA</p>
          </div>
        </Link>
        <Link href="/dashboard/patients/new"
          className="card hover:shadow-card-hover hover:border-navy/30 transition-all
                     cursor-pointer group flex flex-col gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <UserPlus className="w-4.5 h-4.5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-navy transition-colors">
              Nuevo paciente
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Registrar expediente</p>
          </div>
        </Link>
      </div>

      {/* Recent patients */}
      {!loading && recientes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Actividad reciente
            </h2>
            <Link href="/dashboard/patients"
              className="text-xs text-navy font-medium hover:underline cursor-pointer">
              Ver todos
            </Link>
          </div>
          <div className="space-y-1.5">
            {recientes.map(p => (
              <Link key={p.id} href={`/dashboard/patients/${p.id}`}
                className="card flex items-center justify-between hover:shadow-card-hover
                           hover:border-slate-300 transition-all py-3.5 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-navy/8 flex items-center justify-center
                                  text-navy font-bold text-sm flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900 group-hover:text-navy transition-colors">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.folio} · {p._count.notes} {p._count.notes === 1 ? 'nota' : 'notas'}
                      {p.notes?.[0] && ` · última: ${format(parseLocalDate(p.notes[0].consultDate), 'd MMM', { locale: es })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`soap-badge ${
                    p.notes?.[0]?.type === 'INTAKE'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {p.notes?.[0]?.type === 'INTAKE' ? 'Ingreso' : 'Seguimiento'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && patients.length === 0 && (
        <div className="card text-center py-14 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FilePen className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700">Sin pacientes aún</h3>
          <p className="text-sm text-slate-400 mt-1 mb-5">Registra tu primer paciente para comenzar</p>
          <Link href="/dashboard/patients/new" className="btn btn-primary">
            Registrar paciente
          </Link>
        </div>
      )}
    </div>
  );
}
