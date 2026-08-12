import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, hours, monthLabel } from '../../lib/format'
import { TASK_STATUS_LABELS } from '../../lib/labels'
import { Card, ErrorNote, PageLoader } from '../../components/ui'

/* Colores del sistema de visualización (una sola serie → tono secuencial azul) */
const C = { blue: '#2a78d6', muted: '#898781', grid: '#e1e0d9', ink: '#52514e' }

function HoursTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-600">{hours(payload[0].value)}</p>
    </div>
  )
}

export default function ClientProjectReport() {
  const { documentId = '' } = useParams()

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['client-report', documentId],
    queryFn: () => api(`/me/projects/${documentId}/report`),
  })

  if (isLoading) return <PageLoader />
  if (error) return <ErrorNote error={error} />

  const byMonth = (report.byMonth || []).slice(-6).map((m: any) => ({ ...m, label: monthLabel(m.month) }))

  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Mis proyectos
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{report.project.name}</h1>
        <p className="mt-0.5 text-sm text-slate-500">Reporte de horas de trabajo</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Horas totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{hours(report.totalHours)}</p>
        </Card>
        {Object.entries(report.taskCounts || {}).map(([status, count]) => (
          <Card key={status} className="p-4">
            <p className="text-xs text-slate-500">{TASK_STATUS_LABELS[status] || status}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{count as number}</p>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Horas por mes</h2>
          {byMonth.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byMonth} margin={{ top: 26, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} strokeWidth={1} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: C.grid }} tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis hide />
                <Tooltip content={<HoursTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="hours" name="Horas" fill={C.blue} barSize={22} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="hours" position="top" formatter={(v: any) => String(v)} style={{ fill: C.ink, fontSize: 11, fontWeight: 500 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">Sin horas registradas todavía.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Horas por persona del equipo</h2>
          <ul className="space-y-3">
            {(report.byDeveloper || []).map((d: any) => {
              const pct = report.totalHours ? Math.round((d.hours / report.totalHours) * 100) : 0
              return (
                <li key={d.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{d.name}</span>
                    <span className="text-slate-500">{hours(d.hours)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.blue }} />
                  </div>
                </li>
              )
            })}
            {!(report.byDeveloper || []).length && (
              <p className="py-8 text-center text-sm text-slate-400">Sin registros.</p>
            )}
          </ul>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Trabajo reciente</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {(report.recentEntries || []).map((e: any, i: number) => (
            <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="w-20 shrink-0 text-xs text-slate-400">{fmtDate(e.date)}</span>
              <span className="min-w-0 flex-1 truncate text-slate-700">
                <span className="font-medium text-slate-900">{e.task || '—'}</span>
                {e.description ? <span className="text-slate-500"> · {e.description}</span> : null}
              </span>
              <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">{e.developer}</span>
              <span className="shrink-0 font-medium text-slate-900">{hours(e.hours)}</span>
            </li>
          ))}
          {!(report.recentEntries || []).length && (
            <li className="px-5 py-8 text-center text-sm text-slate-400">Sin registros todavía.</li>
          )}
        </ul>
      </Card>
    </div>
  )
}
