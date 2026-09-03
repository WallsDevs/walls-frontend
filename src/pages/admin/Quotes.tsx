import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Eye, FileSpreadsheet, Plus } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, money, todayISO } from '../../lib/format'
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_TONES } from '../../lib/labels'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  Select,
  TableWrap,
  Td,
  Textarea,
  Th,
} from '../../components/ui'

const emptyForm = () => ({
  title: '',
  description: '',
  project: '',
  issuedDate: todayISO(),
  validUntil: '',
  notes: '',
})

function QuoteForm({ open, onClose, quote }: { open: boolean; onClose: () => void; quote?: any | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm())

  const { data: projects } = useQuery({
    queryKey: ['projects-min'],
    queryFn: () => rest.list('projects', { sort: 'name:asc', pagination: { pageSize: 100 } }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setForm(
      quote
        ? {
            title: quote.title || '',
            description: quote.description || '',
            project: quote.project?.documentId || '',
            issuedDate: quote.issuedDate || todayISO(),
            validUntil: quote.validUntil || '',
            notes: quote.notes || '',
          }
        : emptyForm(),
    )
  }, [open, quote])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: async () => {
      const data: any = { ...form, validUntil: form.validUntil || null }
      if (quote) return rest.update('quotes', quote.documentId, data)

      const year = new Date(form.issuedDate || Date.now()).getFullYear()
      const existing = await rest.list('quotes', {
        filters: { number: { $startsWith: `PRE-${year}-` } },
        pagination: { pageSize: 200 },
      })
      return rest.create('quotes', {
        ...data,
        number: `PRE-${year}-${String(existing.length + 1).padStart(4, '0')}`,
        status: 'draft',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['quote'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={quote ? `Editar ${quote.number}` : 'Nuevo presupuesto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.title || !form.project}>
            {quote ? 'Guardar cambios' : 'Crear presupuesto'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título *">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Rediseño del portal de empleados" />
        </Field>
        <Field label="Proyecto *" hint="Los entregables se facturan dentro de este proyecto">
          <Select value={form.project} onChange={(e) => set('project', e.target.value)} disabled={!!quote}>
            <option value="">Selecciona…</option>
            {(projects || []).map((p: any) => (
              <option key={p.documentId} value={p.documentId}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción / alcance">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Qué incluye el trabajo…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de emisión">
            <Input type="date" value={form.issuedDate} onChange={(e) => set('issuedDate', e.target.value)} />
          </Field>
          <Field label="Válido hasta">
            <Input type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
          </Field>
        </div>
        <Field label="Notas">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

export default function Quotes() {
  const [formModal, setFormModal] = useState<{ open: boolean; quote?: any }>({ open: false })

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () =>
      rest.list('quotes', {
        populate: { project: true, milestones: true },
        sort: 'number:desc',
        pagination: { pageSize: 100 },
      }),
  })

  if (isLoading) return <PageLoader />

  const list = quotes || []
  const totalOf = (q: any) => (q.milestones || []).reduce((s: number, m: any) => s + Number(m.amount || 0), 0)
  const approved = list.filter((q: any) => q.status === 'approved')
  const pipeline = list
    .filter((q: any) => q.status === 'sent')
    .reduce((s: number, q: any) => s + totalOf(q), 0)

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        subtitle="Trabajos por entregable: cotizas, el cliente aprueba, y facturas cada hito al entregarlo"
        actions={
          <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
            Nuevo presupuesto
          </Button>
        }
      />

      {list.length ? (
        <div className="mb-4 flex flex-wrap gap-3">
          <Card className="px-4 py-2.5">
            <span className="text-xs text-slate-500">Aprobados: </span>
            <span className="font-semibold text-emerald-600">
              {money(approved.reduce((s: number, q: any) => s + totalOf(q), 0))}
            </span>
          </Card>
          <Card className="px-4 py-2.5">
            <span className="text-xs text-slate-500">Enviados sin respuesta: </span>
            <span className="font-semibold text-amber-600">{money(pipeline)}</span>
          </Card>
        </div>
      ) : null}

      {!list.length ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Sin presupuestos"
          description="Crea un presupuesto con sus entregables. Cuando el cliente lo apruebe y vayas entregando los hitos, aparecerán automáticamente en Por facturar."
          action={
            <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
              Nuevo presupuesto
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Presupuesto</Th>
              <Th>Proyecto</Th>
              <Th>Entregables</Th>
              <Th right>Total</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((q: any) => {
              const ms = q.milestones || []
              const delivered = ms.filter((m: any) => m.status === 'delivered').length
              return (
                <tr key={q.documentId} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-900">{q.number}</Td>
                  <Td>
                    <Link to={`/quotes/${q.documentId}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {q.title}
                    </Link>
                    <p className="text-xs text-slate-400">{fmtDate(q.issuedDate)}</p>
                  </Td>
                  <Td className="text-slate-600">{q.project?.name || '—'}</Td>
                  <Td>
                    <span className="text-slate-600">
                      {delivered}/{ms.length} entregados
                    </span>
                  </Td>
                  <Td right className="font-semibold">{money(totalOf(q))}</Td>
                  <Td>
                    <Badge tone={QUOTE_STATUS_TONES[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Link to={`/quotes/${q.documentId}`}>
                        <Button size="sm" variant="ghost" icon={Eye}>
                          Abrir
                        </Button>
                      </Link>
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      )}

      <QuoteForm open={formModal.open} onClose={() => setFormModal({ open: false })} quote={formModal.quote} />
    </div>
  )
}
