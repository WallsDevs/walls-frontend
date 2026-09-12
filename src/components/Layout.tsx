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
  FileSpreadsheet,
  Wallet,
  Clock3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Target,
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
    { to: '/quotes', label: 'Presupuestos', icon: FileSpreadsheet },
    { to: '/leads', label: 'Leads', icon: Target },
    { to: '/billing', label: 'Facturación', icon: Receipt },
    { to: '/clients', label: 'Clientes', icon: Building2 },
    { to: '/staff', label: 'Equipo interno', icon: Briefcase },
    { to: '/personal-invoices', label: 'Facturas propias', icon: Wallet },
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

const COLLAPSE_KEY = 'walls_sidebar_collapsed'

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cx('flex items-center gap-2.5', collapsed ? 'justify-center px-0' : 'px-2')}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white shadow-sm">
        W
      </div>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">Walls</p>
          <p className="truncate text-[11px] text-slate-400">Panel administrativo</p>
        </div>
      ) : null}
    </div>
  )
}

function SidebarContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
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

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cx(
      'flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors',
      collapsed ? 'justify-center px-0' : 'px-2.5',
      isActive ? 'bg-brand-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
    )

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-6 pt-5">
        <Brand collapsed={collapsed} />
      </div>
      {!collapsed ? (
        <p className="mb-2 px-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {ROLE_LABELS[role] || 'Menú'}
        </p>
      ) : null}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={linkCls} title={collapsed ? item.label : undefined}>
            <item.icon size={17} className="shrink-0" />
            {!collapsed ? item.label : null}
          </NavLink>
        ))}
        {myWork.length > 0 && (
          <>
            {!collapsed ? (
              <p className="px-2.5 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mi trabajo</p>
            ) : (
              <div className="my-2 border-t border-white/10" />
            )}
            {myWork.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={onNavigate} className={linkCls} title={collapsed ? item.label : undefined}>
                <item.icon size={17} className="shrink-0" />
                {!collapsed ? item.label : null}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={cx('mb-2 flex items-center gap-2.5', collapsed ? 'justify-center px-0' : 'px-2')}>
          <div
            title={collapsed ? name : undefined}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white"
          >
            {(name || '?')
              .split(' ')
              .slice(0, 2)
              .map((p: string) => p[0])
              .join('')
              .toUpperCase()}
          </div>
          {!collapsed ? (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-white">{name}</p>
              <p className="truncate text-[11px] text-slate-400">{auth?.me.email}</p>
            </div>
          ) : null}
        </div>
        <button
          onClick={logout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cx(
            'flex w-full items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
            collapsed ? 'justify-center px-0' : 'px-2.5',
          )}
        >
          <LogOut size={17} />
          {!collapsed ? 'Cerrar sesión' : null}
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // localStorage puede fallar en modo privado; no es crítico
      }
      return next
    })
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar escritorio */}
      <aside
        className={cx(
          'no-print fixed inset-y-0 left-0 z-30 hidden bg-slate-900 transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="absolute -right-3 top-6 flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-800"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
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

      <main className={cx('px-4 py-6 transition-[margin] duration-200 sm:px-6 lg:px-8', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
