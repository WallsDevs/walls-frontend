import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListTodo,
  Receipt,
  Building2,
  Briefcase,
  Clock3,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { cx } from './ui'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/developers', label: 'Developers', icon: Users },
    { to: '/projects', label: 'Proyectos', icon: FolderKanban },
    { to: '/tasks', label: 'Tareas', icon: ListTodo },
    { to: '/billing', label: 'Facturación', icon: Receipt },
    { to: '/clients', label: 'Clientes', icon: Building2 },
    { to: '/staff', label: 'Equipo interno', icon: Briefcase },
  ],
  developer: [
    { to: '/', label: 'Mis tareas', icon: ListTodo, end: true },
    { to: '/my-hours', label: 'Mis horas', icon: Clock3 },
  ],
  client: [
    { to: '/', label: 'Mis proyectos', icon: FolderKanban, end: true },
    { to: '/invoices', label: 'Facturas', icon: Receipt },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administración',
  developer: 'Portal del developer',
  client: 'Portal del cliente',
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white shadow-sm">
        W
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">Walls</p>
        <p className="text-[11px] text-slate-400">Panel administrativo</p>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { auth, logout } = useAuth()
  const role = auth?.me.role || 'authenticated'
  const items = NAV_BY_ROLE[role] || []
  // Admins con perfil de developer vinculado también trabajan horas en proyectos
  const myWork: NavItem[] =
    role === 'admin' && auth?.me.profile?.documentId
      ? [
          { to: '/my-tasks', label: 'Mis tareas', icon: ListTodo },
          { to: '/my-hours', label: 'Mis horas', icon: Clock3 },
        ]
      : []
  const name =
    auth?.me.profile?.firstName
      ? `${auth.me.profile.firstName} ${auth.me.profile.lastName ?? ''}`.trim()
      : auth?.me.profile?.name || auth?.me.username || ''

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-6 pt-5">
        <Brand />
      </div>
      <p className="mb-2 px-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {ROLE_LABELS[role] || 'Menú'}
      </p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <item.icon size={17} className="shrink-0" />
            {item.label}
          </NavLink>
        ))}
        {myWork.length > 0 && (
          <>
            <p className="px-2.5 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Mi trabajo
            </p>
            {myWork.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <item.icon size={17} className="shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2.5 px-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {(name || '?')
              .split(' ')
              .slice(0, 2)
              .map((p: string) => p[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-400">{auth?.me.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Sidebar escritorio */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block">
        <SidebarContent />
      </aside>

      {/* Topbar móvil */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white">
            W
          </div>
          <span className="text-sm font-semibold text-slate-900">Walls</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Drawer móvil */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
