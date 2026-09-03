import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Eye, Plus, Trash2, Wallet } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, money, todayISO } from '../../lib/format'
import { INVOICE_STATUS_LABELS } from '../../lib/labels'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  TableWrap,
  Td,
  Textarea,
  Th,
  INVOICE_STATUS_TONES,
} from '../../components/ui'

type Line = { description: string; quantity: string; rate: string }

const emptyLine = (): Line => ({ description: '', quantity: '1', rate: '' })
const emptyForm = () => ({
  clientName: '',
  clientTaxId: '',
  clientEmail: '',
  clientAddress: '',
  issuedDate: todayISO(),
  dueDate: '',
  taxRate: '0',
  notes: '',
  paymentInfo: '',
})

const lineAmount = (l: Line) => (Number(l.quantity) || 0) * (Number(l.rate) || 0)

function InvoiceForm({ open, onClose, invoice }: { open: boolean; onClose: () => void; invoice?: any | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm())
  const [lines, setLines] = useState<Line[]>([emptyLine()])

  useEffect(() => {
    if (!open) return
    if (invoice) {
      setForm({
        clientName: invoice.clientName || '',
        clientTaxId: invoice.clientTaxId || '',
        clientEmail: invoice.clientEmail || '',
        clientAddress: invoice.clientAddress || '',
        issuedDate: invoice.issuedDate || todayISO(),
        dueDate: invoice.dueDate || '',
        taxRate: String(invoice.taxRate ?? '0'),
        notes: invoice.notes || '',
        paymentInfo: invoice.paymentInfo || '',
      })
      setLines(
        (invoice.lines || []).length
          ? invoice.lines.map((l: any) => ({
              description: l.description || '',
              quantity: String(l.quantity ?? '1'),
              rate: String(l.rate ?? ''),
            }))
          : [emptyLine()],
      )
    } else {
      setForm(emptyForm())
      setLines([emptyLine()])
    }
  }, [open, invoice])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))
  const setLine = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))

  const subtotal = lines.reduce((s, l) => s + lineAmount(l), 0)
  const taxAmount = subtotal * ((Number(form.taxRate) || 0) / 100)
  const total = subtotal + taxAmount

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        taxRate: Number(form.taxRate) || 0,
        dueDate: form.dueDate || null,
        lines: lines
          .filter((l) => l.description.trim() || lineAmount(l) > 0)
          .map((l) => ({
            description: l.description,
            quantity: Number(l.quantity) || 0,
            rate: Number(l.rate) || 0,
          })),
      }
      return invoice
        ? rest.update('personal-invoices', invoice.documentId, data)
        : rest.create('personal-invoices', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-invoices'] })
      onClose()
    },
  })

  const valid = form.clientName.trim() && lines.some((l) => lineAmount(l) > 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? `Editar ${invoice.number}` : 'Nueva factura propia'}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!valid}>
            {invoice ? 'Guardar cambios' : 'Crear factura'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente *">
            <Input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Nombre o empresa" />
          </Field>
          <Field label="NIT / ID fiscal">
            <Input value={form.clientTaxId} onChange={(e) => set('clientTaxId', e.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} />
          </Field>
          <Field label="Dirección">
            <Input value={form.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} />
          </Field>
          <Field label="Fecha de emisión">
            <Input type="date" value={form.issuedDate} onChange={(e) => set('issuedDate', e.target.value)} />
          </Field>
          <Field label="Vencimiento">
            <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Conceptos</span>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setLines([...lines, emptyLine()])}>
              Agregar línea
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_80px_110px_90px_auto]">
                <Input
                  value={l.description}
                  onChange={(e) => setLine(i, 'description', e.target.value)}
                  placeholder="Descripción del trabajo"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={l.quantity}
                  onChange={(e) => setLine(i, 'quantity', e.target.value)}
                  placeholder="Cant."
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.rate}
                  onChange={(e) => setLine(i, 'rate', e.target.value)}
                  placeholder="Precio"
                />
                <div className="flex items-center justify-end px-2 text-sm font-medium text-slate-700">
                  {money(lineAmount(l))}
                </div>
                <button
                  type="button"
                  onClick={() => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : [emptyLine()])}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-end gap-4 rounded-lg bg-slate-50 p-3">
          <Field label="Impuesto (%)" className="w-28">
            <Input type="number" min={0} step="0.1" value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} />
          </Field>
          <div className="text-right text-sm">
            <p className="text-slate-500">
              Subtotal: <span className="font-medium text-slate-900">{money(subtotal)}</span>
            </p>
            {Number(form.taxRate) > 0 ? (
              <p className="text-slate-500">
                Impuesto: <span className="font-medium text-slate-900">{money(taxAmount)}</span>
              </p>
            ) : null}
            <p className="mt-1 text-base font-semibold text-slate-900">Total: {money(total)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Datos de pago" hint="Cómo te van a pagar (cuenta, Binance, etc.)">
            <Textarea value={form.paymentInfo} onChange={(e) => set('paymentInfo', e.target.value)} />
          </Field>
          <Field label="Notas">
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>

        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

export default function PersonalInvoices() {
  const qc = useQueryClient()
  const [formModal, setFormModal] = useState<{ open: boolean; invoice?: any }>({ open: false })
  const [deleting, setDeleting] = useState<any | null>(null)

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['personal-invoices'],
    queryFn: () => rest.list('personal-invoices', { sort: 'number:desc', pagination: { pageSize: 100 } }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      rest.update('personal-invoices', id, {
        status,
        paidDate: status === 'paid' ? todayISO() : null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-invoices'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => rest.remove('personal-invoices', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-invoices'] })
      setDeleting(null)
    },
  })

  if (isLoading) return <PageLoader />

  const list = invoices || []
  const paid = list.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.total || 0), 0)
  const pending = list
    .filter((i: any) => i.status !== 'paid')
    .reduce((s: number, i: any) => s + Number(i.total || 0), 0)

  return (
    <div>
      <PageHeader
        title="Facturas propias"
        subtitle="Trabajos por fuera de la agencia — ingreso personal, no entra en los números de Walls"
        actions={
          <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
            Nueva factura
          </Button>
        }
      />

      {list.length ? (
        <div className="mb-4 flex flex-wrap gap-3">
          <Card className="px-4 py-2.5">
            <span className="text-xs text-slate-500">Cobrado: </span>
            <span className="font-semibold text-emerald-600">{money(paid)}</span>
          </Card>
          <Card className="px-4 py-2.5">
            <span className="text-xs text-slate-500">Por cobrar: </span>
            <span className="font-semibold text-amber-600">{money(pending)}</span>
          </Card>
        </div>
      ) : null}

      {!list.length ? (
        <EmptyState
          icon={Wallet}
          title="Sin facturas propias"
          description="Crea facturas de los trabajos que haces por tu cuenta. Son privadas: solo tú las ves, y no afectan la facturación ni las métricas de la agencia."
          action={
            <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
              Nueva factura
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th>Emitida</Th>
              <Th right>Total</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((inv: any) => (
              <tr key={inv.documentId} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-900">{inv.number}</Td>
                <Td>
                  <p className="text-slate-800">{inv.clientName}</p>
                  <p className="text-xs text-slate-400">{inv.clientTaxId}</p>
                </Td>
                <Td className="whitespace-nowrap text-slate-500">{fmtDate(inv.issuedDate)}</Td>
                <Td right className="font-semibold">{money(inv.total, inv.currency)}</Td>
                <Td>
                  <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {inv.status === 'draft' && (
                      <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate({ id: inv.documentId, status: 'sent' })}>
                        Marcar enviada
                      </Button>
                    )}
                    {inv.status === 'sent' && (
                      <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate({ id: inv.documentId, status: 'paid' })}>
                        Marcar cobrada
                      </Button>
                    )}
                    <Link to={`/personal-invoices/${inv.documentId}`}>
                      <Button size="sm" variant="ghost" icon={Eye}>
                        Ver
                      </Button>
                    </Link>
                    <button
                      onClick={() => setFormModal({ open: true, invoice: inv })}
                      className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleting(inv)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <InvoiceForm open={formModal.open} onClose={() => setFormModal({ open: false })} invoice={formModal.invoice} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeMutation.mutate(deleting.documentId)}
        loading={removeMutation.isPending}
        title="Eliminar factura"
        message={`¿Eliminar ${deleting?.number}? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
