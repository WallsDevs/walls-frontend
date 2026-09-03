import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import { money, todayISO } from '../../lib/format'
import { Button, Card, ErrorNote, Field, Input, PageLoader, Select, Textarea } from '../../components/ui'
import PersonalInvoiceDoc from '../../components/PersonalInvoiceDoc'

type Line = { description: string; quantity: string; rate: string }

const emptyLine = (): Line => ({ description: '', quantity: '1', rate: '' })
const lineAmount = (l: Line) => (Number(l.quantity) || 0) * (Number(l.rate) || 0)

const emptyForm = () => ({
  client: '',
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

export default function PersonalInvoiceEditor() {
  const { documentId } = useParams()
  const isEdit = !!documentId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState<any>(emptyForm())
  const [lines, setLines] = useState<Line[]>([emptyLine()])

  const { data: clients } = useQuery({
    queryKey: ['clients-min'],
    queryFn: () => rest.list('clients', { sort: 'name:asc', pagination: { pageSize: 100 } }),
  })

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['personal-invoice', documentId],
    queryFn: () => rest.one('personal-invoices', documentId!, { populate: { client: true } }),
    enabled: isEdit,
  })

  useEffect(() => {
    if (!invoice) return
    setForm({
      client: invoice.client?.documentId || '',
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
  }, [invoice])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))
  const setLine = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))

  /** Al elegir un cliente nuestro, se rellenan sus datos; se pueden ajustar igual. */
  const pickClient = (id: string) => {
    const c = (clients || []).find((x: any) => x.documentId === id)
    setForm((f: any) => ({
      ...f,
      client: id,
      ...(c ? { clientName: c.name || '', clientTaxId: c.taxId || '', clientEmail: c.email || '' } : {}),
    }))
  }

  const subtotal = lines.reduce((s, l) => s + lineAmount(l), 0)
  const taxAmount = subtotal * ((Number(form.taxRate) || 0) / 100)
  const total = subtotal + taxAmount

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        client: form.client || null,
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
      return isEdit
        ? rest.update('personal-invoices', documentId!, data)
        : rest.create('personal-invoices', data)
    },
    onSuccess: (saved: any) => {
      qc.invalidateQueries({ queryKey: ['personal-invoices'] })
      qc.invalidateQueries({ queryKey: ['personal-invoice'] })
      navigate(`/personal-invoices/${saved.documentId}`)
    },
  })

  if (isEdit && isLoading) return <PageLoader />

  const valid = form.clientName.trim() && lines.some((l) => lineAmount(l) > 0)

  // Lo que se ve en el preview, con los mismos cálculos que hará el servidor
  const preview = {
    ...form,
    number: invoice?.number,
    status: invoice?.status,
    currency: invoice?.currency || 'USD',
    subtotal,
    taxRate: Number(form.taxRate) || 0,
    taxAmount,
    total,
    lines: lines
      .filter((l) => l.description.trim() || lineAmount(l) > 0)
      .map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 0,
        rate: Number(l.rate) || 0,
        amount: lineAmount(l),
      })),
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/personal-invoices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Facturas propias
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/personal-invoices')}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!valid}>
            {isEdit ? 'Guardar cambios' : 'Crear factura'}
          </Button>
        </div>
      </div>

      <h1 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">
        {isEdit ? `Editar ${invoice?.number || ''}` : 'Nueva factura propia'}
      </h1>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,480px)_1fr]">
        {/* Formulario */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Cliente</h2>
            <div className="space-y-3">
              <Field label="Cliente registrado" hint="Elige uno tuyo o déjalo vacío y escribe los datos abajo">
                <Select value={form.client} onChange={(e) => pickClient(e.target.value)}>
                  <option value="">Otro cliente (escribir datos)</option>
                  {(clients || []).map((c: any) => (
                    <option key={c.documentId} value={c.documentId}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nombre o empresa *">
                <Input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="NIT / ID fiscal">
                  <Input value={form.clientTaxId} onChange={(e) => set('clientTaxId', e.target.value)} />
                </Field>
                <Field label="Correo">
                  <Input type="email" value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} />
                </Field>
              </div>
              <Field label="Dirección">
                <Textarea
                  value={form.clientAddress}
                  onChange={(e) => set('clientAddress', e.target.value)}
                  className="min-h-16"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Conceptos</h2>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setLines([...lines, emptyLine()])}>
                Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_70px_100px_auto]">
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
            <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
              <Field label="Impuesto (%)" className="w-28">
                <Input type="number" min={0} step="0.1" value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} />
              </Field>
              <p className="text-right text-base font-semibold text-slate-900">Total: {money(total)}</p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Fechas y detalles</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha de emisión">
                <Input type="date" value={form.issuedDate} onChange={(e) => set('issuedDate', e.target.value)} />
              </Field>
              <Field label="Vencimiento">
                <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </Field>
            </div>
            <Field label="Datos de pago" className="mt-3" hint="Cómo te van a pagar (cuenta, Binance, etc.)">
              <Textarea value={form.paymentInfo} onChange={(e) => set('paymentInfo', e.target.value)} />
            </Field>
            <Field label="Notas" className="mt-3">
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
            {mutation.error ? <div className="mt-3"><ErrorNote error={mutation.error} /></div> : null}
          </Card>
        </div>

        {/* Preview en vivo */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vista previa</p>
          <Card className="overflow-hidden">
            <PersonalInvoiceDoc inv={preview} />
          </Card>
        </div>
      </div>
    </div>
  )
}
