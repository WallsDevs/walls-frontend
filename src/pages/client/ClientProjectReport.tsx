import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, hours, monthLabel } from '../../lib/format'
import { PRIORITY_LABELS, TASK_KIND_LABELS, TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '../../lib/labels'
import { usePersistedState } from '../../lib/usePersistedState'
import { AvatarStack, Badge, Card, ErrorNote, Modal, PageLoader, PRIORITY_TONES, SearchInput, Select, TASK_STATUS_TONES } from '../../components/ui'

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

type BoardFilters = { search: string; developer: string; priority: string; kind: string }
const EMPTY_FILTERS: BoardFilters = { search: '', developer: '', priority: '', kind: '' }

/** Detalle de una tarea para el cliente: solo lectura, sin tarifas. */
function TaskDetailModal({ task, onClose }: { task: any | null; onClose: () => void }) {
  const entries = [...(task?.entries || [])].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
  return (
    <Modal open={!!task} onClose={onClose} title={task?.title || ''} size="lg">
      {task ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TASK_STATUS_TONES[task.status] || 'gray'}>{TASK_STATUS_LABELS[task.status]}</Badge>
            <Badge tone={PRIORITY_TONES[task.priority] || 'gray'}>Prioridad {PRIORITY_LABELS[task.priority]?.toLowerCase()}</Badge>
            {task.kind === 'reunion' ? <Badge tone="violet">Reunión</Badge> : null}
            {task.status === 'done' && task.completedAt ? (
              <span className="text-xs text-emerald-600">Completada {fmtDate(task.completedAt)}</span>
            ) : task.dueDate ? (
              <span className="text-xs text-slate-500">Vence {fmtDate(task.dueDate)}</span>
            ) : null}
          </div>

          {task.description ? <p className="whitespace-pre-line text-sm text-slate-700">{task.description}</p> : <p className="text-sm text-slate-400">Sin descripción.</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Horas registradas</p>
              <p className="text-lg font-semibold text-slate-900">{hours(task.hours)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Estimado</p>
              <p className="text-lg font-semibold text-slate-900">{task.estimateHours ? hours(task.estimateHours) : '—'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Equipo</p>
              <div className="mt-1 flex items-center gap-2">
                <AvatarStack people={task.assignees || []} />
                <span className="truncate text-xs text-slate-600">{(task.assignees || []).map((a: any) => a.name).join(', ') || '—'}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Trabajo registrado</p>
            {entries.length ? (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {entries.map((e: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-24 shrink-0 text-xs text-slate-400">{fmtDate(e.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {e.developer || '—'}
                      {e.description ? <span className="text-slate-500"> · {e.description}</span> : null}
                    </span>
                    {e.kind === 'reunion' ? <Badge tone="violet">Reunión</Badge> : null}
                    <span className="shrink-0 font-medium text-slate-900">{hours(e.hours)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Todavía no hay horas registradas en esta tarea.</p>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export default function ClientProjectReport() {
  const { documentId = '' } = useParams()
  const [filters, setFilters] = usePersistedState<BoardFilters>(`walls_client_board_${documentId}`, EMPTY_FILTERS)
  const f: BoardFilters = { ...EMPTY_FILTERS, ...filters }
  const setF = (k: keyof BoardFilters, v: string) => setFilters((prev) => ({ ...EMPTY_FILTERS, ...prev, [k]: v }))
  const [openTask, setOpenTask] = useState<any | null>(null)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['client-report', documentId],
    queryFn: () => api(`/me/projects/${documentId}/report`),
  })

  const allTasks: any[] = report?.tasks || []
  const developers = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of allTasks) for (const a of t.assignees || []) map.set(a.documentId, a.name)
    return [...map.entries()].map(([documentId, name]) => ({ documentId, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [allTasks])

  const visibleTasks = useMemo(() => {
    const q = f.search.toLowerCase()
    return allTasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false
      if (f.developer && !(t.assignees || []).some((a: any) => a.documentId === f.developer)) return false
      if (f.priority && t.priority !== f.priority) return false
      if (f.kind && t.kind !== f.kind) return false
      return true
    })
  }, [allTasks, f.search, f.developer, f.priority, f.kind])
  const hasFilters = !!(f.search || f.developer || f.priority || f.kind)

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
        <p className="mt-0.5 text-sm text-slate-500">Horas de trabajo y tablero de tareas</p>
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
            {!(report.byDeveloper || []).length && <p className="py-8 text-center text-sm text-slate-400">Sin registros.</p>}
          </ul>
        </Card>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold text-slate-900">Tablero de tareas</h2>
          <div className="w-full sm:w-56">
            <SearchInput value={f.search} onChange={(v) => setF('search', v)} placeholder="Buscar tarea…" />
          </div>
          <Select value={f.developer} onChange={(e) => setF('developer', e.target.value)} className="w-full sm:w-auto" style={{ maxWidth: '100%' }}>
            <option value="">Todo el equipo</option>
            {developers.map((d) => (
              <option key={d.documentId} value={d.documentId}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select value={f.priority} onChange={(e) => setF('priority', e.target.value)} className="w-full sm:w-auto" style={{ maxWidth: '100%' }}>
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select value={f.kind} onChange={(e) => setF('kind', e.target.value)} className="w-full sm:w-auto" style={{ maxWidth: '100%' }}>
            <option value="">Tareas y reuniones</option>
            {Object.entries(TASK_KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                Solo {v.toLowerCase() === 'tarea' ? 'tareas' : 'reuniones'}
              </option>
            ))}
          </Select>
          {hasFilters ? (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-sm font-medium text-slate-400 hover:text-slate-600">
              Limpiar filtros
            </button>
          ) : null}
          <span className="ml-auto text-xs text-slate-400">
            {visibleTasks.length} de {allTasks.length} tareas · haz clic en una para ver el detalle
          </span>
        </div>
        <div className="grid gap-3 overflow-x-auto md:grid-cols-4">
          {TASK_STATUS_ORDER.map((status) => {
            const list = visibleTasks.filter((t: any) => t.status === status)
            return (
              <div key={status} className="flex min-w-[220px] flex-col rounded-xl bg-slate-100 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{TASK_STATUS_LABELS[status]}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{list.length}</span>
                </div>
                {/* Scroll interno por columna: muchas completadas no empujan el resto de la página */}
                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-0.5">
                  {list.map((t: any) => (
                    <button
                      key={t.documentId}
                      type="button"
                      onClick={() => setOpenTask(t)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                    >
                      <p className="mb-1.5 text-sm font-medium leading-snug text-slate-900">{t.title}</p>
                      {t.description ? <p className="mb-1.5 line-clamp-2 text-xs text-slate-500">{t.description}</p> : null}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={PRIORITY_TONES[t.priority] || 'gray'}>{PRIORITY_LABELS[t.priority]}</Badge>
                        {t.kind === 'reunion' ? <Badge tone="violet">Reunión</Badge> : null}
                        <span className="text-xs text-slate-400">
                          {hours(t.hours)}
                          {t.estimateHours ? ` / ${hours(t.estimateHours)}` : ''}
                        </span>
                        <AvatarStack people={t.assignees || []} className="ml-auto" />
                      </div>
                      {t.status === 'done' && t.completedAt ? (
                        <p className="mt-1.5 text-xs text-emerald-600">Completada {fmtDate(t.completedAt)}</p>
                      ) : t.dueDate ? (
                        <p className="mt-1.5 text-xs text-slate-400">Vence {fmtDate(t.dueDate)}</p>
                      ) : null}
                    </button>
                  ))}
                  {!list.length ? <p className="py-4 text-center text-xs text-slate-400">Vacío</p> : null}
                </div>
              </div>
            )
          })}
        </div>
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
          {!(report.recentEntries || []).length && <li className="px-5 py-8 text-center text-sm text-slate-400">Sin registros todavía.</li>}
        </ul>
      </Card>

      <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} />
    </div>
  )
}
