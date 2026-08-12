import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Users, FolderKanban, ListTodo, Clock3, Receipt, TrendingUp, type LucideIcon } from 'lucide-react'
import { api } from '../../lib/api'
import { money, hours, fmtDate, monthLabel } from '../../lib/format'
import { Card, PageHeader, PageLoader, ErrorNote } from '../../components/ui'

/* Paleta de visualización validada (dataviz): slot 1 azul, slot 2 naranja */
const C = {
  blue: '#2a78d6',
  orange: '#eb6834',
  ink: '#0b0b0b',
  muted: '#898781',
  grid: '#e1e0d9',
}

const compactMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={17} />
        </div>
      </div>
    </Card>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-slate-600">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-medium text-slate-900">{typeof p.value === 'number' ? (p.dataKey === 'hours' ? hours(p.value) : money(p.value)) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api('/dashboard/stats'),
  })

  if (isLoading) return <PageLoader />
  if (error) return <ErrorNote error={error} />

  const revenue = (data.revenueByMonth || []).map((r: any) => ({
    ...r,
    label: monthLabel(r.month),
  }))
  const hasRevenue = revenue.some((r: any) => r.total > 0)
  const currentMonth = revenue[revenue.length - 1]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general de la agencia" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Devs activos" value={String(data.counts.activeDevelopers)} icon={Users} />
        <Stat label="Proyectos activos" value={String(data.counts.activeProjects)} icon={FolderKanban} />
        <Stat label="Tareas abiertas" value={String(data.counts.openTasks)} icon={ListTodo} />
        <Stat label="Horas este mes" value={hours(data.hoursThisMonth)} icon={Clock3} />
        <Stat
          label="Por facturar"
          value={money(data.unbilled.clientAmount)}
          sub={`${hours(data.unbilled.hours)} sin facturar`}
          icon={Receipt}
        />
        <Stat
          label="Facturado este mes"
          value={money(currentMonth?.total || 0)}
          sub={`Ganancia ${money(currentMonth?.profit || 0)}`}
          icon={TrendingUp}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Facturación · últimos 6 meses</h2>
            <div className="flex gap-3">
              <LegendDot color={C.blue} label="Pago a devs" />
              <LegendDot color={C.orange} label="Ganancia agencia" />
            </div>
          </div>
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} strokeWidth={1} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                  tick={{ fill: C.muted, fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: C.muted, fontSize: 11 }}
                  tickFormatter={compactMoney}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="devPay" name="Pago a devs" stackId="rev" fill={C.blue} barSize={22} stroke="#fff" strokeWidth={1} />
                <Bar
                  dataKey="profit"
                  name="Ganancia agencia"
                  stackId="rev"
                  fill={C.orange}
                  barSize={22}
                  radius={[4, 4, 0, 0]}
                  stroke="#fff"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">Aún no hay facturas enviadas o pagadas.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Horas por proyecto · este mes</h2>
          {data.hoursByProject.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.hoursByProject}
                layout="vertical"
                margin={{ top: 4, right: 44, left: 4, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52514e', fontSize: 12 }}
                  width={130}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="hours" name="Horas" fill={C.blue} barSize={18} radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="hours"
                    position="right"
                    formatter={(v: any) => hours(Number(v))}
                    style={{ fill: '#52514e', fontSize: 11, fontWeight: 500 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">Sin horas registradas este mes.</p>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {data.recentEntries.map((e: any) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="w-20 shrink-0 text-xs text-slate-400">{fmtDate(e.date)}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-slate-800">{e.developer}</span>
                <span className="text-slate-500"> registró {hours(e.hours)} en </span>
                <span className="font-medium text-slate-800">{e.task}</span>
              </span>
              <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline">
                {e.project}
              </span>
            </li>
          ))}
          {!data.recentEntries.length && (
            <li className="px-5 py-8 text-center text-sm text-slate-400">Sin actividad todavía.</li>
          )}
        </ul>
      </Card>
    </div>
  )
}
