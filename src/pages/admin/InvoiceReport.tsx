import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, Printer, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, hours } from '../../lib/format'
import { TASK_KIND_LABELS, TASK_STATUS_LABELS } from '../../lib/labels'
import { Badge, Button, ErrorNote, PageLoader, TASK_STATUS_TONES } from '../../components/ui'
import wordmark from '../../assets/brand/logo-wordmark-black.svg'

const PALETTE = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777', '#4b5563']

const weekLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(d).replace('.', '')
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon size={13} /> {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function SectionTitle({ children, sub }: { children: string; sub?: string }) {
  return (
    <div className="mb-3 border-b border-slate-200 pb-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{children}</h2>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  )
}

/** Fila de tarea con el detalle de horas desplegable (en impresión siempre abierto). */
function TaskRow({ task, total, color }: { task: any; total: number; color: string }) {
  const [open, setOpen] = useState(false)
  const pct = total > 0 ? Math.round((task.hours / total) * 100) : 0
  const over = task.estimateHours != null && task.estimateHours > 0 && task.hours > task.estimateHours
  return (
    <div className="print-break-inside-avoid border-b border-slate-100 py-2.5 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 text-left">
        <span className="no-print mt-1 text-slate-400">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{task.title}</p>
            {task.kind === 'reunion' ? <Badge tone="violet">{TASK_KIND_LABELS.reunion}</Badge> : null}
            {task.status ? <Badge tone={TASK_STATUS_TONES[task.status] || 'gray'}>{TASK_STATUS_LABELS[task.status] || task.status}</Badge> : null}
          </div>
          {task.description ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p> : null}
          <p className="mt-0.5 text-xs text-slate-500">
            {task.developers.join(', ') || '—'}
            {task.project ? ` · ${task.project}` : ''}
            {task.estimateHours != null ? (
              <span className={over ? ' text-amber-700' : ''}>
                {' '}· estimado {hours(task.estimateHours)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="w-28 shrink-0 text-right">
          <p className="font-semibold text-slate-900">{hours(task.hours)}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
          <p className="text-[10px] text-slate-400">{pct}% del total</p>
        </div>
      </button>
      <div className={open ? 'mt-2 pl-9' : 'print-only mt-2 pl-9'}>
        <table className="w-full text-xs">
          <tbody>
            {task.entries.map((e: any, i: number) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="w-28 whitespace-nowrap py-1 pr-2 text-slate-400">{fmtDate(e.date)}</td>
                <td className="w-40 whitespace-nowrap py-1 pr-2 text-slate-600">{e.developer || '—'}</td>
                <td className="py-1 text-slate-600">
                  {e.description || <span className="text-slate-300">Sin descripción</span>}
                  {e.kind === 'reunion' ? <span className="ml-1 text-violet-600">(reunión)</span> : null}
                </td>
                <td className="w-16 py-1 text-right font-medium text-slate-800">{hours(e.hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Reporte de trabajo de una factura: lo que se le envía al cliente para justificar las horas y
 * los entregables cobrados. Sin tarifas ni pagos a developers. Imprimible a PDF.
 */
export default function InvoiceReport() {
  const { documentId = '' } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice-report', documentId],
    queryFn: () => api(`/billing/invoices/${documentId}/report`),
  })

  if (isLoading) return <PageLoader />
  if (error || !data) return <ErrorNote error={error || new Error('Reporte no disponible')} />

  const { invoice, client, projects, totals, developers, tasks, weeks, milestones } = data
  const devColor = new Map<string, string>(developers.map((d: any, i: number) => [d.name, PALETTE[i % PALETTE.length]]))
  const taskColor = (t: any) => devColor.get(t.developers[0]) || PALETTE[7]
  const weekData = weeks.map((w: any) => ({ ...w, label: weekLabel(w.week) }))
  const hasHours = totals.hours > 0

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to={`/billing/invoices/${documentId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Factura {invoice.number}
        </Link>
        <Button icon={Printer} onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </div>

      <div className="print-area invoice-doc mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        {/* Cabecera */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <img src={wordmark} alt="Walls Team" className="h-6 w-auto" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Reporte de trabajo</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{projects.map((p: any) => p.name).join(' + ') || 'Proyecto'}</h1>
            <p className="text-sm text-slate-500">
              {client?.name || '—'} · Período {fmtDate(invoice.periodStart)} – {fmtDate(invoice.periodEnd)}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Factura</p>
            <p className="text-lg font-semibold text-slate-900">{invoice.number}</p>
            <p className="text-slate-500">Emitida {fmtDate(invoice.issuedDate)}</p>
          </div>
        </div>

        {/* Resumen */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Clock3} label="Horas" value={hours(totals.hours)} hint={totals.meetingHours > 0 ? `${hours(totals.meetingHours)} en reuniones` : `${totals.entryCount} registros`} />
          <Stat icon={Users} label="Equipo" value={String(totals.developerCount)} hint={totals.developerCount === 1 ? 'developer' : 'developers'} />
          <Stat icon={FileText} label="Tareas" value={String(totals.taskCount)} hint={totals.tasksDone ? `${totals.tasksDone} completadas` : 'con horas registradas'} />
          <Stat icon={CheckCircle2} label="Entregables" value={String(totals.milestoneCount)} hint={totals.milestoneCount ? 'de presupuesto' : 'en este período'} />
        </div>

        {hasHours ? (
          <>
            {/* Gráficas */}
            <div className="print-break-inside-avoid mb-8 grid gap-6 sm:grid-cols-[1fr_1.4fr]">
              <div>
                <SectionTitle sub="Distribución de horas">Por developer</SectionTitle>
                <div className="flex items-center gap-4">
                  <div className="h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={developers} dataKey="hours" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2} stroke="none" isAnimationActive={false}>
                          {developers.map((d: any) => (
                            <Cell key={d.name} fill={devColor.get(d.name)} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => hours(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                    {developers.map((d: any) => (
                      <li key={d.name} className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: devColor.get(d.name) }} />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium text-slate-800">{d.name}</span>
                          {d.role ? <span className="text-slate-400"> · {d.role}</span> : null}
                        </span>
                        <span className="shrink-0 font-medium text-slate-900">{hours(d.hours)}</span>
                        <span className="w-10 shrink-0 text-right text-xs text-slate-400">{Math.round((d.hours / totals.hours) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <SectionTitle sub="Horas registradas cada semana (semana que inicia el)">Por semana</SectionTitle>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData} margin={{ top: 18, right: 8, left: -22, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any) => hours(Number(v))} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                        <LabelList dataKey="hours" position="top" formatter={(v: any) => hours(Number(v))} style={{ fontSize: 10, fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tareas */}
            <div className="mb-8">
              <SectionTitle sub="Qué se hizo con esas horas. El detalle por día aparece al desplegar cada tarea y completo en el PDF.">
                Tareas trabajadas
              </SectionTitle>
              {tasks.map((t: any) => (
                <TaskRow key={t.documentId || 'none'} task={t} total={totals.hours} color={taskColor(t)} />
              ))}
            </div>
          </>
        ) : null}

        {/* Entregables */}
        {milestones.length ? (
          <div className="print-break-inside-avoid mb-8">
            <SectionTitle sub="Hitos de presupuesto incluidos en esta factura">Entregables</SectionTitle>
            <ul className="space-y-2">
              {milestones.map((m: any) => (
                <li key={m.documentId} className="flex gap-3 rounded-lg border border-slate-200 px-4 py-3">
                  <CheckCircle2 size={18} className={m.status === 'delivered' ? 'mt-0.5 shrink-0 text-emerald-500' : 'mt-0.5 shrink-0 text-slate-300'} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{m.title}</p>
                    {m.description ? <p className="whitespace-pre-line text-xs text-slate-500">{m.description}</p> : null}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {m.quoteNumber ? `Presupuesto ${m.quoteNumber}` : ''}
                      {m.developer ? ` · ${m.developer}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    {m.status === 'delivered' ? (
                      <>
                        <Badge tone="green">Entregado</Badge>
                        <p className="mt-1 text-slate-400">{fmtDate(m.deliveredAt)}</p>
                      </>
                    ) : (
                      <>
                        <Badge tone="amber">Anticipo</Badge>
                        {m.dueDate ? <p className="mt-1 text-slate-400">Estimado {fmtDate(m.dueDate)}</p> : null}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!hasHours && !milestones.length ? (
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">Esta factura no tiene horas ni entregables asociados.</p>
        ) : null}

        {invoice.notes ? <p className="text-xs text-slate-500">Notas: {invoice.notes}</p> : null}
        <p className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          Walls Team · Reporte generado el {fmtDate(new Date().toISOString())} · Acompaña a la factura {invoice.number}
        </p>
      </div>
    </div>
  )
}
