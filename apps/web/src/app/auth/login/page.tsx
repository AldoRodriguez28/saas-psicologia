'use client';
import { useState, useRef, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/lib/auth-store';
import { Brain, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

function getLoginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'No hay conexión. Comprueba tu red e inténtalo de nuevo.';
    }
    const data = err.response.data as { message?: string | string[] };
    const m = data?.message;
    if (Array.isArray(m) && m[0]) return String(m[0]);
    if (typeof m === 'string' && m.trim()) return m;
    if (err.response.status === 401) {
      return 'El correo o la contraseña no coinciden. Revisa e inténtalo otra vez.';
    }
    return 'No pudimos iniciar sesión. Prueba otra vez en unos segundos.';
  }
  return 'Algo no salió bien. Vuelve a intentarlo.';
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const errorId = `${formId}-error`;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const clearFieldError = () => setError('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.replace('/dashboard');
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <aside
        className="hidden lg:flex lg:w-1/2 bg-navy flex-col justify-between p-12 relative overflow-hidden"
        aria-label="SistemaNota, contexto de la plataforma"
      >
        <div
          className="absolute inset-0 opacity-5"
          aria-hidden
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center" aria-hidden>
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-xl">
              Sistema<span className="text-teal-light">Nota</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <p className="text-white/90 text-xl font-medium leading-relaxed max-w-md">
            Notas clínicas estructuradas en segundos, no en horas.
          </p>
          <ul className="space-y-3 list-none" role="list">
            {[
              'Formato SOAP generado con IA',
              'Diagnósticos CIE-10 automáticos',
              'Historial clínico seguro y organizado',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-white/70 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-light shrink-0" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-white/30 text-xs">Psicología clínica · expedientes digitales</p>
      </aside>

      <main
        className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12 bg-slate-100"
        aria-labelledby="login-heading"
      >
        <div className="w-full max-w-md">
          <header className="mb-6 sm:mb-8 lg:mb-10">
            <div className="flex items-center gap-2.5 mb-5 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center" aria-hidden>
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl text-navy">
                Sistema<span className="text-teal">Nota</span>
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-teal mb-1.5" id="login-eyebrow">
              Iniciar sesión
            </p>
            <h1
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              id="login-heading"
            >
              Bienvenida de vuelta
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed">
              Introduce el correo y la contraseña de tu cuenta.
            </p>
          </header>

          <div
            className="bg-white rounded-2xl shadow-form p-6 sm:p-7 border border-slate-200/80
                       ring-1 ring-slate-900/5"
          >
            <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? errorId : undefined}>
              <div>
                <label htmlFor={emailId} className="label !normal-case !tracking-normal">
                  Correo electrónico
                </label>
                <input
                  id={emailId}
                  className={clsx(
                    'input min-h-[44px] text-base sm:text-sm',
                    error && 'border-red-300 bg-red-50/40 ring-2 ring-inset ring-red-200 focus:border-red-400 focus:ring-2',
                  )}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="tu@correo.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    clearFieldError();
                  }}
                  disabled={loading}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>

              <div>
                <label htmlFor={passwordId} className="label !normal-case !tracking-normal">
                  Contraseña
                </label>
                <input
                  id={passwordId}
                  className={clsx(
                    'input min-h-[44px] text-base sm:text-sm',
                    error && 'border-red-300 bg-red-50/40 ring-2 ring-inset ring-red-200 focus:border-red-400 focus:ring-2',
                  )}
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, password: e.target.value }));
                    clearFieldError();
                  }}
                  disabled={loading}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>

              {error && (
                <div
                  ref={errorRef}
                  id={errorId}
                  role="alert"
                  tabIndex={-1}
                  className="flex items-start gap-2.5 text-sm text-red-800 bg-red-50
                             border border-red-200/90 px-3.5 py-3 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2
                             motion-reduce:transition-none"
                >
                  <AlertCircle
                    className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600"
                    aria-hidden
                    strokeWidth={2.25}
                  />
                  <span className="leading-snug font-medium">{error}</span>
                </div>
              )}

              <div className="pt-0.5">
                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="btn btn-primary w-full justify-center h-12 text-sm
                             disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                             motion-reduce:transition-none"
                >
                  {loading ? (
                    <>
                      <Loader2
                        className="w-4 h-4 shrink-0 motion-reduce:animate-none animate-spin"
                        aria-hidden
                      />
                      <span>Verificando acceso…</span>
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
                {loading && (
                  <span className="sr-only">Enviando formulario, espera a que termine.</span>
                )}
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-slate-600 mt-6 sm:mt-7">
            ¿Aún no tienes cuenta?{' '}
            <Link
              href="/auth/register"
              className="text-navy font-semibold underline underline-offset-2 decoration-navy/30
                         hover:decoration-navy focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-navy/40 focus-visible:ring-offset-2 rounded"
            >
              Crear una cuenta
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
