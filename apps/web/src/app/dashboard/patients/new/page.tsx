'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { patientsApi } from '@/lib/api';
import { ArrowLeft, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

const EMPTY_FORM = {
  name: '', birthDate: '', sex: 'M',
  phone: '', address: '', maritalStatus: '', occupation: '', curp: '',
  birthPlace: '', guardian: '', guardianRelation: '', referredBy: '',
  interrogatorio: '', insurance: '', insuranceNumber: '',
};

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showClinical, setShowClinical] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await patientsApi.create(form as any);
      router.push(`/dashboard/patients/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrar paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-navy
                   transition-colors cursor-pointer mb-6">
        <ArrowLeft className="w-4 h-4" />
        Pacientes
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo paciente</h1>
        <p className="text-sm text-slate-500 mt-1">Se generará un folio único automáticamente.</p>
      </div>

      <div className="card shadow-form border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Datos requeridos ── */}
          <div>
            <label htmlFor="name" className="label">Nombre completo o iniciales</label>
            <input id="name" className="input" required
              value={form.name} onChange={set('name')}
              placeholder="Ej: J.L.G. o Juan López García" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="birthDate" className="label">Fecha de nacimiento</label>
              <input id="birthDate" className="input" type="date" required
                value={form.birthDate} onChange={set('birthDate')} />
            </div>
            <div>
              <label htmlFor="sex" className="label">Sexo</label>
              <select id="sex" className="input cursor-pointer" value={form.sex} onChange={set('sex') as any}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTHER">No especificado</option>
              </select>
            </div>
          </div>

          {/* ── Contacto y sociodemográficos ── */}
          <div className="border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowContact(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500
                         hover:text-navy transition-colors cursor-pointer w-full text-left">
              <ChevronDown className={`w-4 h-4 transition-transform ${showContact ? 'rotate-180' : ''}`} />
              Contacto y sociodemográficos
              <span className="text-xs text-slate-400 font-normal ml-1">(opcionales)</span>
            </button>

            {showContact && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="label">Teléfono</label>
                    <input id="phone" className="input" type="tel"
                      value={form.phone} onChange={set('phone')}
                      placeholder="229 000 0000" />
                  </div>
                  <div>
                    <label htmlFor="maritalStatus" className="label">Estado civil</label>
                    <select id="maritalStatus" className="input cursor-pointer"
                      value={form.maritalStatus} onChange={set('maritalStatus') as any}>
                      <option value="">Sin especificar</option>
                      <option value="Soltero/a">Soltero/a</option>
                      <option value="Casado/a">Casado/a</option>
                      <option value="Unión libre">Unión libre</option>
                      <option value="Divorciado/a">Divorciado/a</option>
                      <option value="Viudo/a">Viudo/a</option>
                      <option value="Separado/a">Separado/a</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="occupation" className="label">Ocupación</label>
                    <input id="occupation" className="input"
                      value={form.occupation} onChange={set('occupation')}
                      placeholder="Ej: Estudiante, Empleado…" />
                  </div>
                  <div>
                    <label htmlFor="birthPlace" className="label">Lugar de nacimiento</label>
                    <input id="birthPlace" className="input"
                      value={form.birthPlace} onChange={set('birthPlace')}
                      placeholder="Municipio, Estado" />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="label">Domicilio</label>
                  <input id="address" className="input"
                    value={form.address} onChange={set('address')}
                    placeholder="Calle, número, colonia, municipio" />
                </div>

                <div>
                  <label htmlFor="curp" className="label">CURP</label>
                  <input id="curp" className="input" maxLength={18}
                    value={form.curp} onChange={e => setForm(f => ({ ...f, curp: e.target.value.toUpperCase() }))}
                    placeholder="XXXX000000XXXXXXXX" />
                </div>
              </div>
            )}
          </div>

          {/* ── Datos clínicos de ingreso ── */}
          <div className="border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowClinical(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500
                         hover:text-navy transition-colors cursor-pointer w-full text-left">
              <ChevronDown className={`w-4 h-4 transition-transform ${showClinical ? 'rotate-180' : ''}`} />
              Datos clínicos de ingreso
              <span className="text-xs text-slate-400 font-normal ml-1">(opcionales)</span>
            </button>

            {showClinical && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="referredBy" className="label">Remitido por</label>
                    <input id="referredBy" className="input"
                      value={form.referredBy} onChange={set('referredBy')}
                      placeholder="Médico, institución…" />
                  </div>
                  <div>
                    <label htmlFor="interrogatorio" className="label">Tipo de interrogatorio</label>
                    <select id="interrogatorio" className="input cursor-pointer"
                      value={form.interrogatorio} onChange={set('interrogatorio') as any}>
                      <option value="">Sin especificar</option>
                      <option value="Directo">Directo</option>
                      <option value="Indirecto">Indirecto</option>
                      <option value="Mixto">Mixto</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guardian" className="label">Familiar / Responsable</label>
                    <input id="guardian" className="input"
                      value={form.guardian} onChange={set('guardian')}
                      placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label htmlFor="guardianRelation" className="label">Parentesco</label>
                    <input id="guardianRelation" className="input"
                      value={form.guardianRelation} onChange={set('guardianRelation')}
                      placeholder="Madre, padre, tutor…" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="insurance" className="label">Derechohabiencia</label>
                    <select id="insurance" className="input cursor-pointer"
                      value={form.insurance} onChange={set('insurance') as any}>
                      <option value="">Sin especificar</option>
                      <option value="IMSS">IMSS</option>
                      <option value="ISSSTE">ISSSTE</option>
                      <option value="Pemex">Pemex</option>
                      <option value="Sedena">Sedena</option>
                      <option value="Semar">Semar</option>
                      <option value="Seguro Popular">Seguro Popular</option>
                      <option value="Ninguna">Ninguna</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="insuranceNumber" className="label">Número de afiliación</label>
                    <input id="insuranceNumber" className="input"
                      value={form.insuranceNumber} onChange={set('insuranceNumber')}
                      placeholder="Número de afiliación" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 text-xs text-red-700 bg-red-50
                            border border-red-200 px-3 py-2.5 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="btn btn-primary flex-1 justify-center h-11">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Registrando…</>
              ) : 'Registrar paciente'}
            </button>
            <Link href="/dashboard/patients" className="btn btn-secondary">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
