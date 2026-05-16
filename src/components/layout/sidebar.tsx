'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Building2,
  CalendarDays,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Docentes', href: '/docentes', icon: Users },
  { name: 'Cursos', href: '/cursos', icon: BookOpen },
  { name: 'Aulas', href: '/aulas', icon: Building2 },
  { name: 'Periodos', href: '/periodos', icon: CalendarDays },
  { name: 'Sesiones', href: '/sesiones', icon: ClipboardList },
  { name: 'Horarios', href: '/horarios', icon: Calendar },
  { name: 'Reportes', href: '/reportes', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight">Horarios ISI</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">UNT</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-indigo-600/20 text-indigo-400 shadow-sm shadow-indigo-500/10'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }
              `}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${
                isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'
              }`} />
              {item.name}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 px-4 py-3">
        <p className="text-[10px] text-gray-600 text-center">
          Sistema de Horarios v2.0
        </p>
      </div>
    </aside>
  );
}
