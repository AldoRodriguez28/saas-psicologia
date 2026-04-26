'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Brain, AlertCircle, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '', password: '', name: '', cedula: '', institution: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.register(form);
      localStorage.setItem('token', data.access_token);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-navy flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-xl">
              Sistema<span className="text-teal-light">Nota</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-white text-2xl font-bold leading-tight">
            Tu expediente clínico digital comienza aquí
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Crea tu cuenta en segundos y empieza a documentar consultas con el apoyo de inteligencia artificial.
          </p>
        </div>

        <p className="relative z-10 text-white/30 text-xs">
          Psicología Clínica · Expedientes digitales
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-navy">
              Sistema<span className="text-teal">Nota</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta</h1>
            <p className="text-sm text-slate-500 mt-1">Psicóloga · Expedientes clínicos digitales</p>
          </div>

          <div className="bg-white rounded-2xl shadow-form p-6 border border-slate-100">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="label">Nombre completo</label>
                <input id="name" className="input" required
                  placeholder="Dra. María García" value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label htmlFor="email" className="label">Correo electrónico</label>
                <input id="email" className="input" type="email" required autoComplete="email"
                  placeholder="tu@correo.com" value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label htmlFor="password" className="label">Contraseña</label>
                <input id="password" className="input" type="password" required
                  minLength={6} autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} />
              </div>

              <div className="pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-3 font-medium">Datos profesionales (opcionales)</p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cedula" className="label">Cédula profesional</label>
                    <input id="cedula" className="input" placeholder="12345678"
                      value={form.cedula} onChange={set('cedula')} />
                  </div>
                  <div>
                    <label htmlFor="institution" className="label">Institución</label>
                    <input id="institution" className="input"
                      placeholder="Unidad de Salud Mental Veracruz"
                      value={form.institution} onChange={set('institution')} />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-xs text-red-700 bg-red-50
                                border border-red-200 px-3 py-2.5 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="btn btn-primary w-full justify-center h-11 text-sm mt-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando cuenta…
                  </>
                ) : 'Crear cuenta'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-navy font-semibold hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
