import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, Pencil, Plus, Printer, Send, Trash2, XCircle } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, hours, money, todayISO } from '../../lib/format'
import { MILESTONE_STATUS_LABELS, QUOTE_STATUS_LABELS, QUOTE_STATUS_TONES } from '../../lib/labels'
import wordmark from '../../assets/brand/logo-wordmark-black.svg'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageLoader,
  Select,
  Td,
  Textarea,
  Th,
  TableWrap,
} from '../../components/ui'

const emptyMilestone = () => ({ title: '', description: '', amount: '', devAmount: '', developer: '', dueDate: '' })

function MilestoneForm({
  open,
  onClose,
  quoteId,
  milestone,
  position,
}: {
  open: boolean
  onClose: () => void
  quoteId: string
  milestone?: any | null
  position: number
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyMilestone())

  const { data: devs } = useQuery({
    queryKey: ['developers-min'],
    queryFn: () => rest.list('developers', { sort: 'firstName:asc', pagination: { pageSize: 100 } }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setForm(
      milestone
        ? {
            title: milestone.title || '',
            description: milestone.description || '',
            amount: String(milestone.amount ?? ''),
            devAmount: String(milestone.devAmount ?? ''),
            developer: milestone.developer?.documentId || '',
            dueDate: milestone.dueDate || '',
          }
        : emptyMilestone(),
    )
  }, [open, milestone])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const data: any = {
        title: form.title,
        description: form.description || null,
        amount: Number(form.amount) || 0,
        devAmount: Number(form.devAmount) || 0,
        developer: form.developer || null,
        dueDate: form.dueDate || null,
        quote: quoteId,
      }
      if (milestone) return rest.update('milestones', milestone.documentId, data)
      return rest.create('milestones', { ...data, status: 'pending', position })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', quoteId] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
      onClose()
    },
  })

  const margin = (Number(form.amount) || 0) - (Number(form.devAmount) || 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={milestone ? 'Editar entregable' : 'Nuevo entregable'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.title || !form.amount}>
            {milestone ? 'Guardar' : 'Agregar entregable'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Entregable *">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Módulo de reportes" />
        </Field>
        <Field label="Descripción">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Qué incluye este hito…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cobro al cliente (USD) *">
            <Input type="number" min={0} step="10" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="800" />
          </Field>
          <Field label="Pago al dev (USD)" hint="Déjalo en 0 si no aplica">
            <Input type="number" min={0} step="10" value={form.devAmount} onChange={(e) => set('devAmount', e.target.value)} placeholder="500" />
          </Field>
        </div>
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Margen de la agencia: <span className="font-semibold">{money(margin)}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quién lo ejecuta">
            <Select value={form.developer} onChange={(e) => set('developer', e.target.value)}>
              <option value="">Sin asignar</option>
              {(devs || []).map((d: any) => (
                <option key={d.documentId} value={d.documentId}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha estimada">
            <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

/**
 * Documento del presupuesto para el cliente (solo se ve al imprimir). Muestra únicamente lo que
 * el cliente debe ver: entregables, fechas y montos al cliente. Nada de pagos a devs ni márgenes.
 */
function QuoteDoc({ quote, milestones, total }: { quote: any; milestones: any[]; total: number }) {
  const currency = quote.currency || 'USD'
  return (
    <div className="print-only invoice-doc">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <img src={wordmark} alt="Walls Team" className="h-6 w-auto" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Presupuesto</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{quote.title}</h1>
        </div>
        <div className="text-right text-sm">
          <p className="text-lg font-semibold text-slate-900">{quote.number}</p>
          {quote.issuedDate ? <p className="text-slate-500">Emitido {fmtDate(quote.issuedDate)}</p> : null}
          {quote.validUntil ? <p className="text-slate-500">Válido hasta {fmtDate(quote.validUntil)}</p> : null}
          {quote.status === 'approved' && quote.approvedDate ? <p className="text-emerald-700">Aprobado el {fmtDate(quote.approvedDate)}</p> : null}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Preparado para</p>
          <p className="font-medium text-slate-900">{quote.project?.client?.name || '—'}</p>
          {quote.project?.client?.contactName ? <p className="text-slate-500">{quote.project.client.contactName}</p> : null}
          {quote.project?.client?.email ? <p className="text-slate-500">{quote.project.client.email}</p> : null}
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Proyecto</p>
          <p className="font-medium text-slate-900">{quote.project?.name || '—'}</p>
        </div>
      </div>

      {quote.description ? (
        <div className="mb-8 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Alcance</p>
          <p className="whitespace-pre-line text-slate-700">{quote.description}</p>
        </div>
      ) : null}

      <table className="mb-6 w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-900 text-left">
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Entregable</th>
            <th className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha estimada</th>
            <th className="py-2 pl-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Importe</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((m: any) => (
            <tr key={m.documentId} className="border-b border-slate-100 align-top">
              <td className="py-2.5 pr-2">
                <p className="font-medium text-slate-900">{m.title}</p>
                {m.description ? <p className="whitespace-pre-line text-xs text-slate-500">{m.description}</p> : null}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">
                {m.status === 'delivered' && m.deliveredAt ? `Entregado ${fmtDate(m.deliveredAt)}` : fmtDate(m.dueDate)}
              </td>
              <td className="py-2.5 pl-2 text-right font-medium text-slate-900">{money(m.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-8 flex justify-end">
        <div className="w-64 text-sm">
          <div className="flex justify-between border-t-2 border-slate-900 py-2 text-base font-semibold text-slate-900">
            <span>Total {currency}</span>
            <span>{money(total, currency)}</span>
          </div>
        </div>
      </div>

      {quote.notes ? (
        <div className="text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Notas y condiciones</p>
          <p className="whitespace-pre-line text-slate-600">{quote.notes}</p>
        </div>
      ) : null}
      <p className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">Walls Team · Gracias por confiar en nosotros.</p>
    </div>
  )
}

/** Horas registradas en el proyecto desde la aprobación del presupuesto (referencia interna). */
function QuoteHours({ quote }: { quote: any }) {
  const projectId = quote.project?.documentId
  const since = quote.approvedDate || quote.issuedDate || String(quote.createdAt || '').slice(0, 10)
  const { data: entries } = useQuery({
    queryKey: ['quote-hours', projectId, since],
    queryFn: () =>
      rest.listAll('time-entries', {
        filters: { project: { documentId: projectId }, ...(since ? { date: { $gte: since } } : {}) },
        populate: { developer: true, task: true, invoice: true },
        sort: 'date:asc',
      }),
    enabled: !!projectId,
  })
  if (!projectId) return null
  const list: any[] = entries || []
  const total = list.reduce((s, e) => s + Number(e.hours || 0), 0)
  const byDev = new Map<string, number>()
  const byTask = new Map<string, number>()
  const invoices = new Map<string, string>()
  for (const e of list) {
    const d = e.developer ? `${e.developer.firstName} ${e.developer.lastName}`.trim() : 'Sin developer'
    byDev.set(d, (byDev.get(d) || 0) + Number(e.hours || 0))
    const t = e.task?.title || 'Sin tarea'
    byTask.set(t, (byTask.get(t) || 0) + Number(e.hours || 0))
    if (e.invoice) invoices.set(e.invoice.documentId, e.invoice.number)
  }
  const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])
  return (
    <Card className="mt-4 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Clock3 size={15} className="text-slate-400" /> Horas registradas en el proyecto
          </h3>
          <p className="text-xs text-slate-500">
            Desde el {fmtDate(since)} · lo que realmente tomó ejecutar este presupuesto. No se imprime.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900">{hours(total)}</p>
          <p className="text-xs text-slate-400">{list.length} registros</p>
        </div>
      </div>
      {list.length ? (
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Por developer</p>
            <ul className="space-y-1">
              {sorted(byDev).map(([name, h]) => (
                <li key={name} className="flex justify-between">
                  <span className="text-slate-700">{name}</span>
                  <span className="font-medium text-slate-900">{hours(h)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Por tarea</p>
            <ul className="space-y-1">
              {sorted(byTask)
                .slice(0, 8)
                .map(([name, h]) => (
                  <li key={name} className="flex justify-between gap-3">
                    <span className="truncate text-slate-700">{name}</span>
                    <span className="shrink-0 font-medium text-slate-900">{hours(h)}</span>
                  </li>
                ))}
              {byTask.size > 8 ? <li className="text-xs text-slate-400">y {byTask.size - 8} tareas más</li> : null}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Todavía no hay horas registradas en el proyecto desde esa fecha.</p>
      )}
      {invoices.size ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Reporte de trabajo para el cliente:</span>
          {[...invoices.entries()].map(([id, number]) => (
            <Link key={id} to={`/billing/invoices/${id}/report`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200">
              <BarChart3 size={12} /> {number}
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

export default function QuoteDetail() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [msModal, setMsModal] = useState<{ open: boolean; milestone?: any }>({ open: false })
  const [deletingMs, setDeletingMs] = useState<any | null>(null)
  const [deletingQuote, setDeletingQuote] = useState(false)
  // Fechas manuales: al aprobar el presupuesto y al marcar un entregable como entregado.
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; date: string }>({ open: false, date: todayISO() })
  const [deliverDialog, setDeliverDialog] = useState<{ milestone: any | null; date: string }>({ milestone: null, date: todayISO() })

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', documentId],
    queryFn: () =>
      rest.one('quotes', documentId, {
        populate: { project: { populate: { client: true } }, milestones: { populate: { developer: true } } },
      }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, approvedDate }: { status: string; approvedDate?: string | null }) =>
      rest.update('quotes', documentId, {
        status,
        approvedDate: status === 'approved' ? approvedDate || todayISO() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', documentId] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
    },
  })

  const approvedDateMutation = useMutation({
    mutationFn: (approvedDate: string) => rest.update('quotes', documentId, { approvedDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', documentId] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
    },
  })

  const msDeliveredAtMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => rest.update('milestones', id, { deliveredAt: new Date(`${date}T12:00:00`).toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', documentId] })
      qc.invalidateQueries({ queryKey: ['unbilled'] })
    },
  })

  const msStatusMutation = useMutation({
    mutationFn: ({ id, status, deliveredAt }: { id: string; status: string; deliveredAt?: string }) =>
      rest.update('milestones', id, { status, ...(deliveredAt ? { deliveredAt: new Date(`${deliveredAt}T12:00:00`).toISOString() } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', documentId] })
      qc.invalidateQueries({ queryKey: ['unbilled'] })
    },
  })

  const deleteMsMutation = useMutation({
    mutationFn: (id: string) => rest.remove('milestones', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', documentId] })
      setDeletingMs(null)
    },
  })

  const deleteQuoteMutation = useMutation({
    mutationFn: () => rest.remove('quotes', documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      navigate('/quotes')
    },
  })

  if (isLoading) return <PageLoader />
  if (error || !quote) return <ErrorNote error={error || new Error('Presupuesto no encontrado')} />

  const milestones = [...(quote.milestones || [])].sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
  const total = milestones.reduce((s: number, m: any) => s + Number(m.amount || 0), 0)
  const devTotal = milestones.reduce((s: number, m: any) => s + Number(m.devAmount || 0), 0)
  const delivered = milestones.filter((m: any) => m.status === 'delivered')
  const approved = quote.status === 'approved'

  return (
    <div>
      <div className="no-print">
        <Link to="/quotes" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Presupuestos
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{quote.title}</h1>
              <Badge tone={QUOTE_STATUS_TONES[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-slate-500">
              <span>
                {quote.number} · {quote.project?.name}
                {quote.project?.client ? ` · ${quote.project.client.name}` : ''}
              </span>
              {quote.status === 'approved' ? (
                <label className="inline-flex items-center gap-1.5">
                  · Aprobado el
                  <input
                    type="date"
                    value={quote.approvedDate || ''}
                    onChange={(e) => e.target.value && approvedDateMutation.mutate(e.target.value)}
                    className="rounded border border-transparent bg-transparent px-1 py-0 text-sm text-slate-700 hover:border-slate-300 focus:border-brand-500 focus:outline-none"
                    title="Fecha de aprobación (editable)"
                  />
                </label>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quote.status === 'draft' && (
              <Button variant="secondary" icon={Send} onClick={() => statusMutation.mutate({ status: 'sent' })} loading={statusMutation.isPending}>
                Marcar enviado
              </Button>
            )}
            {(quote.status === 'sent' || quote.status === 'rejected') && (
              <Button icon={CheckCircle2} onClick={() => setApproveDialog({ open: true, date: todayISO() })} loading={statusMutation.isPending}>
                Marcar aprobado
              </Button>
            )}
            {quote.status === 'sent' && (
              <Button variant="secondary" icon={XCircle} onClick={() => statusMutation.mutate({ status: 'rejected' })}>
                Rechazado
              </Button>
            )}
            <Button variant="secondary" icon={Printer} onClick={() => window.print()} title="Imprime el documento para el cliente: sin pagos a devs ni márgenes">
              Imprimir / PDF
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setDeletingQuote(true)}>
              Eliminar
            </Button>
          </div>
        </div>

        {approved ? (
          <Card className="mb-4 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Presupuesto aprobado. Cada entregable que marques como <strong>Entregado</strong> entra solo en Facturación → Por
            facturar; los pendientes también aparecen ahí y puedes marcarlos para cobrarlos como anticipo.
          </Card>
        ) : (
          <Card className="mb-4 border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Los entregables solo se pueden facturar cuando el presupuesto está <strong>aprobado</strong>.
          </Card>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Entregables · {delivered.length}/{milestones.length} entregados
          </h2>
          <Button size="sm" icon={Plus} onClick={() => setMsModal({ open: true })}>
            Agregar entregable
          </Button>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <Th>Entregable</Th>
              <Th>Ejecuta</Th>
              <Th>Fecha estimada</Th>
              <Th right>Cliente</Th>
              <Th right>Dev</Th>
              <Th right>Margen</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {milestones.map((m: any) => (
              <tr key={m.documentId} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-900">{m.title}</p>
                  {m.description ? <p className="max-w-md text-xs text-slate-500">{m.description}</p> : null}
                  {m.billed ? <Badge tone="green">Facturado</Badge> : null}
                </Td>
                <Td className="text-slate-600">
                  {m.developer ? `${m.developer.firstName} ${m.developer.lastName}` : '—'}
                </Td>
                <Td className="whitespace-nowrap text-slate-500">
                  {m.status === 'delivered' && m.deliveredAt ? (
                    <label className="inline-flex items-center gap-1 text-emerald-600" title={m.billed ? 'Ya facturado: la fecha no se cambia' : 'Fecha de entrega (editable)'}>
                      Entregado
                      <input
                        type="date"
                        value={String(m.deliveredAt).slice(0, 10)}
                        disabled={m.billed}
                        onChange={(e) => e.target.value && msDeliveredAtMutation.mutate({ id: m.documentId, date: e.target.value })}
                        className="rounded border border-transparent bg-transparent px-1 py-0 text-sm text-emerald-700 hover:border-slate-300 focus:border-brand-500 focus:outline-none disabled:opacity-70"
                      />
                    </label>
                  ) : (
                    fmtDate(m.dueDate)
                  )}
                </Td>
                <Td right className="font-medium">{money(m.amount)}</Td>
                <Td right className="text-slate-600">{money(m.devAmount)}</Td>
                <Td right className="font-medium text-emerald-600">
                  {money(Number(m.amount || 0) - Number(m.devAmount || 0))}
                </Td>
                <Td>
                  <Select
                    value={m.status}
                    onChange={(e) =>
                      e.target.value === 'delivered'
                        ? setDeliverDialog({ milestone: m, date: todayISO() })
                        : msStatusMutation.mutate({ id: m.documentId, status: e.target.value })
                    }
                    disabled={m.billed}
                    className="w-36 py-1 text-xs"
                  >
                    {Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setMsModal({ open: true, milestone: m })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil size={15} />
                    </button>
                    {!m.billed ? (
                      <button
                        onClick={() => setDeletingMs(m)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
            {!milestones.length && (
              <tr>
                <Td colSpan={8} className="py-8 text-center text-slate-400">
                  Todavía no hay entregables. Agrégalos para armar el presupuesto.
                </Td>
              </tr>
            )}
          </tbody>
          {milestones.length ? (
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <Td colSpan={3}>Total del presupuesto</Td>
                <Td right>{money(total)}</Td>
                <Td right>{money(devTotal)}</Td>
                <Td right className="text-emerald-600">{money(total - devTotal)}</Td>
                <Td colSpan={2} />
              </tr>
            </tfoot>
          ) : null}
        </TableWrap>

        {quote.description || quote.notes ? (
          <Card className="mt-4 p-5 text-sm">
            {quote.description ? (
              <>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Alcance</h3>
                <p className="mb-3 whitespace-pre-line text-slate-600">{quote.description}</p>
              </>
            ) : null}
            {quote.notes ? (
              <>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notas</h3>
                <p className="whitespace-pre-line text-slate-600">{quote.notes}</p>
              </>
            ) : null}
          </Card>
        ) : null}

        {approved ? <QuoteHours quote={quote} /> : null}
      </div>

      <QuoteDoc quote={quote} milestones={milestones} total={total} />

      <MilestoneForm
        open={msModal.open}
        onClose={() => setMsModal({ open: false })}
        quoteId={documentId}
        milestone={msModal.milestone}
        position={milestones.length}
      />
      <Modal
        open={approveDialog.open}
        onClose={() => setApproveDialog((d) => ({ ...d, open: false }))}
        title="Marcar presupuesto como aprobado"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveDialog((d) => ({ ...d, open: false }))}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                statusMutation.mutate({ status: 'approved', approvedDate: approveDialog.date })
                setApproveDialog((d) => ({ ...d, open: false }))
              }}
              disabled={!approveDialog.date}
            >
              Aprobar
            </Button>
          </>
        }
      >
        <Field label="Fecha de aprobación" hint="La fecha en que el cliente aceptó, no la de hoy necesariamente">
          <Input type="date" value={approveDialog.date} onChange={(e) => setApproveDialog((d) => ({ ...d, date: e.target.value }))} />
        </Field>
      </Modal>
      <Modal
        open={!!deliverDialog.milestone}
        onClose={() => setDeliverDialog({ milestone: null, date: todayISO() })}
        title={`Marcar entregado · ${deliverDialog.milestone?.title || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeliverDialog({ milestone: null, date: todayISO() })}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                msStatusMutation.mutate({ id: deliverDialog.milestone.documentId, status: 'delivered', deliveredAt: deliverDialog.date })
                setDeliverDialog({ milestone: null, date: todayISO() })
              }}
              disabled={!deliverDialog.date}
            >
              Marcar entregado
            </Button>
          </>
        }
      >
        <Field label="Fecha de entrega" hint="Con esta fecha se decide en qué período se factura">
          <Input type="date" value={deliverDialog.date} onChange={(e) => setDeliverDialog((d) => ({ ...d, date: e.target.value }))} />
        </Field>
      </Modal>
      <ConfirmDialog
        open={!!deletingMs}
        onClose={() => setDeletingMs(null)}
        onConfirm={() => deleteMsMutation.mutate(deletingMs.documentId)}
        loading={deleteMsMutation.isPending}
        title="Eliminar entregable"
        message={`¿Eliminar "${deletingMs?.title}" del presupuesto?`}
      />
      <ConfirmDialog
        open={deletingQuote}
        onClose={() => setDeletingQuote(false)}
        onConfirm={() => deleteQuoteMutation.mutate()}
        loading={deleteQuoteMutation.isPending}
        title="Eliminar presupuesto"
        message={`¿Eliminar ${quote.number} y todos sus entregables?`}
      />
    </div>
  )
}
