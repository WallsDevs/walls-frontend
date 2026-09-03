import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Pencil, Plus, Printer, Send, Trash2, XCircle } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, money } from '../../lib/format'
import { MILESTONE_STATUS_LABELS, QUOTE_STATUS_LABELS, QUOTE_STATUS_TONES } from '../../lib/labels'
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

export default function QuoteDetail() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [msModal, setMsModal] = useState<{ open: boolean; milestone?: any }>({ open: false })
  const [deletingMs, setDeletingMs] = useState<any | null>(null)
  const [deletingQuote, setDeletingQuote] = useState(false)

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', documentId],
    queryFn: () =>
      rest.one('quotes', documentId, {
        populate: { project: { populate: { client: true } }, milestones: { populate: { developer: true } } },
      }),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      rest.update('quotes', documentId, {
        status,
        approvedDate: status === 'approved' ? new Date().toISOString().slice(0, 10) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', documentId] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
    },
  })

  const msStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => rest.update('milestones', id, { status }),
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
            <p className="mt-1 text-sm text-slate-500">
              {quote.number} · {quote.project?.name}
              {quote.project?.client ? ` · ${quote.project.client.name}` : ''}
              {quote.approvedDate ? ` · Aprobado el ${fmtDate(quote.approvedDate)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quote.status === 'draft' && (
              <Button variant="secondary" icon={Send} onClick={() => statusMutation.mutate('sent')} loading={statusMutation.isPending}>
                Marcar enviado
              </Button>
            )}
            {(quote.status === 'sent' || quote.status === 'rejected') && (
              <Button icon={CheckCircle2} onClick={() => statusMutation.mutate('approved')} loading={statusMutation.isPending}>
                Marcar aprobado
              </Button>
            )}
            {quote.status === 'sent' && (
              <Button variant="secondary" icon={XCircle} onClick={() => statusMutation.mutate('rejected')}>
                Rechazado
              </Button>
            )}
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Imprimir
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setDeletingQuote(true)}>
              Eliminar
            </Button>
          </div>
        </div>

        {approved ? (
          <Card className="mb-4 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Presupuesto aprobado. Cada entregable que marques como <strong>Entregado</strong> aparecerá automáticamente en
            Facturación → Por facturar, junto con las horas del proyecto.
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
                    <span className="text-emerald-600">Entregado {fmtDate(m.deliveredAt)}</span>
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
                    onChange={(e) => msStatusMutation.mutate({ id: m.documentId, status: e.target.value })}
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
      </div>

      <MilestoneForm
        open={msModal.open}
        onClose={() => setMsModal({ open: false })}
        quoteId={documentId}
        milestone={msModal.milestone}
        position={milestones.length}
      />
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
