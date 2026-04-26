'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';
import {
  LayoutDashboard,
  Users,
  FilePen,
  LogOut,
  Brain,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Pacientes', icon: Users },
  { href: '/dashboard/notes/new', label: 'Nueva nota', icon: FilePen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuth();

  useEffect(() => { fetchMe(); }, []);
  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Cargando…</p>
      </div>
    </div>
  );

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top nav */}
      <header className="h-14 bg-navy flex items-center justify-between px-5 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">
            Sistema<span className="text-teal-light">Nota</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm hidden sm:block truncate max-w-40">
            {user?.name}
          </span>
          <div className="w-px h-4 bg-white/20 hidden sm:block" />
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm
                       transition-colors duration-200 cursor-pointer px-2 py-1 rounded-md
                       hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-white/30">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col py-5 px-3 hidden md:flex flex-shrink-0">
          <nav className="flex flex-col gap-0.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${
                    isActive
                      ? 'bg-navy/8 text-navy font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-navy' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User card at bottom */}
          <div className="mt-auto">
            <div className="flex items-center gap-2.5 px-3 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
                {user?.institution && (
                  <p className="text-xs text-slate-400 truncate">{user.institution}</p>
                )}
                {user?.cedula && (
                  <p className="text-xs text-slate-400">Céd. {user.cedula}</p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
