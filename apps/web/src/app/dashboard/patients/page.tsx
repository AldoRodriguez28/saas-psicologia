'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { patientsApi } from '@/lib/api';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/dates';
import { es } from 'date-fns/locale';
import { UserPlus, Search, ChevronRight, Users } from 'lucide-react';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    patientsApi.list().then(r => setPatients(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.folio.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {patients.length} {patients.length === 1 ? 'expediente registrado' : 'expedientes registrados'}
          </p>
        </div>
        <Link href="/dashboard/patients/new" className="btn btn-primary">
          <UserPlus className="w-4 h-4" />
          Nuevo paciente
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre o folio…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700">
            {search ? 'Sin resultados' : 'Sin pacientes aún'}
          </h3>
          <p className="text-sm text-slate-400 mt-1 mb-5">
            {search ? 'Prueba con otro término de búsqueda' : 'Registra tu primer paciente para comenzar'}
          </p>
          {!search && (
            <Link href="/dashboard/patients/new" className="btn btn-primary">
              <UserPlus className="w-4 h-4" />
              Registrar paciente
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(p => (
            <Link key={p.id} href={`/dashboard/patients/${p.id}`}
              className="card flex items-center justify-between hover:shadow-card-hover
                         hover:border-slate-300 transition-all py-3.5 cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-navy/8 flex items-center justify-center
                                text-navy font-bold text-sm flex-shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-navy transition-colors">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.folio}
                    {' · '}
                    {p.sex === 'M' ? 'Masculino' : p.sex === 'F' ? 'Femenino' : 'Otro'}
                    {' · '}
                    {p._count.notes} {p._count.notes === 1 ? 'nota' : 'notas'}
                    {p.notes?.[0] && ` · última: ${format(parseLocalDate(p.notes[0].consultDate), 'd MMM yyyy', { locale: es })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {p.notes?.[0] && (
                  <span className={`soap-badge hidden sm:inline-flex ${
                    p.notes[0].type === 'INTAKE'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {p.notes[0].type === 'INTAKE' ? 'Ingreso' : 'Seguimiento'}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
