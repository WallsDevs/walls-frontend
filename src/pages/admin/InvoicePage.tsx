import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Printer } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, hours, money } from '../../lib/format'
import { INVOICE_STATUS_LABELS } from '../../lib/labels'
import { Badge, Button, Card, ErrorNote, PageLoader, INVOICE_STATUS_TONES } from '../../components/ui'
import InvoiceExtrasEditor, { emptyExtras, extrasToPayload, type InvoiceExtras } from '../../components/InvoiceExtrasEditor'
import wordmark from '../../assets/brand/logo-wordmark-black.svg'

/**
 * Factura a cliente. Las líneas de horas, tarifas fijas y entregables vienen de la generación;
 * aquí se pueden agregar ítems adicionales, el impuesto y la comisión de envío/cambio.
 * Los totales los recalcula el servidor al guardar.
 */
export default function InvoicePage() {
  const { documentId = '' } = useParams()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [extras, setExtras] = useState<InvoiceExtras>(emptyExtras())

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoice', documentId],
    queryFn: () => rest.one('invoices', documentId, { populate: { project: true, projects: true, client: true, paymentReport: true } }),
  })

  useEffect(() => {
    if (!inv) return
    setExtras({
      lines: (inv.extraLines || []).map((l: any) => ({ kind: l.kind === 'hours' ? 'hours' : 'fixed', description: l.description || '', quantity: String(l.quantity ?? 1), rate: String(l.rate ?? l.amount ?? '') })),
      taxRate: String(inv.taxRate ?? 0),
      feeAmount: String(inv.feeAmount ?? 0),
      feeLabel: inv.feeLabel || 'Comisión de envío / cambio',
    })
  }, [inv])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoice', documentId] })
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) => rest.update('invoices', documentId, { status }),
    onSuccess: invalidate,
  })

  const saveMutation = useMutation({
    mutationFn: () => rest.update('invoices', documentId, extrasToPayload(extras)),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })

  if (isLoading) return <PageLoader />
  if (error || !inv) return <ErrorNote error={error || new Error('Factura no encontrada')} />

  const lines = inv.lines || []
  const extraLines = inv.extraLines || []
  const projects: any[] = (inv.projects || []).length ? inv.projects : inv.project ? [inv.project] : []
  const currency = inv.currency || 'USD'
  const subtotal = inv.subtotal ?? lines.reduce((s: number, l: any) => s + Number(l.amount || 0), 0)
  const canEdit = inv.status !== 'paid'

  const baseSubtotal = lines.reduce((s: number, l: any) => s + Number(l.amount || 0), 0)

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/billing?tab=invoices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Facturas
        </Link>
        <div className="flex gap-2">
          {canEdit && !editing ? (
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Ítems, impuesto y comisión
            </Button>
          ) : null}
          {inv.status === 'draft' && (
            <Button variant="secondary" onClick={() => statusMutation.mutate('sent')} loading={statusMutation.isPending}>
              Marcar enviada
            </Button>
          )}
          {inv.status === 'sent' && (
            <Button variant="secondary" onClick={() => statusMutation.mutate('paid')} loading={statusMutation.isPending}>
              Marcar pagada
            </Button>
          )}
          <Button icon={Printer} onClick={() => window.print()}>
            Imprimir / PDF
          </Button>
        </div>
      </div>

      <Card className="print-area invoice-doc mx-auto max-w-3xl p-8 sm:p-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <img src={wordmark} alt="Walls" className="h-6 w-auto" />
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{inv.number}</p>
            <div className="no-print mt-1">
              <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Facturar a</p>
            <p className="font-medium text-slate-900">{inv.client?.name || '—'}</p>
            <p className="text-slate-500">{inv.client?.contactName}</p>
            <p className="text-slate-500">{inv.client?.email}</p>
            <p className="text-slate-500">{inv.client?.taxId}</p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Detalles</p>
            <p className="text-slate-600">
              {projects.length > 1 ? 'Proyectos: ' : 'Proyecto: '}
              <span className="font-medium text-slate-900">{projects.map((p) => p.name).join(', ') || '—'}</span>
            </p>
            <p className="text-slate-600">Emitida: {fmtDate(inv.issuedDate)}</p>
            <p className="text-slate-600">
              Período: {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
            </p>
          </div>
        </div>

        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left">
              <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Concepto</th>
              <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cant.</th>
              <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Precio</th>
              <th className="py-2 pl-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Importe</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l: any, i: number) => (
              <tr key={`l${i}`} className="border-b border-slate-100">
                <td className="py-2.5 pr-2">
                  <p className="font-medium text-slate-900">{l.description}</p>
                </td>
                <td className="px-2 py-2.5 text-right text-slate-600">{l.kind === 'hourly' ? hours(l.hours) : '—'}</td>
                <td className="px-2 py-2.5 text-right text-slate-600">{l.kind === 'hourly' ? `${money(l.rate, currency)}/h` : l.kind === 'fixed' ? 'Fija' : '—'}</td>
                <td className="py-2.5 pl-2 text-right font-medium text-slate-900">{money(l.amount, currency)}</td>
              </tr>
            ))}
            {extraLines.map((l: any, i: number) => (
              <tr key={`x${i}`} className="border-b border-slate-100">
                <td className="py-2.5 pr-2">
                  <p className="font-medium text-slate-900">{l.description}</p>
                </td>
                <td className="px-2 py-2.5 text-right text-slate-600">{l.kind === 'hours' ? hours(l.quantity) : l.quantity}</td>
                <td className="px-2 py-2.5 text-right text-slate-600">{l.kind === 'hours' ? `${money(l.rate, currency)}/h` : money(l.rate, currency)}</td>
                <td className="py-2.5 pl-2 text-right font-medium text-slate-900">{money(l.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-8 flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Subtotal</span>
              <span>{money(subtotal, currency)}</span>
            </div>
            {Number(inv.taxRate) > 0 ? (
              <div className="flex justify-between py-1 text-slate-600">
                <span>Impuesto ({inv.taxRate}%)</span>
                <span>{money(inv.taxAmount, currency)}</span>
              </div>
            ) : null}
            {Number(inv.feeAmount) > 0 ? (
              <div className="flex justify-between py-1 text-slate-600">
                <span>{inv.feeLabel || 'Comisión de envío / cambio'}</span>
                <span>{money(inv.feeAmount, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t-2 border-slate-900 py-2 text-base font-semibold text-slate-900">
              <span>Total {currency}</span>
              <span>{money(inv.total, currency)}</span>
            </div>
          </div>
        </div>

        {inv.notes ? <p className="text-xs text-slate-500">Notas: {inv.notes}</p> : null}
        <p className="mt-6 text-center text-xs text-slate-400">Gracias por confiar en Walls.</p>
      </Card>

      {editing ? (
        <Card className="no-print mx-auto mt-4 max-w-3xl p-5">
          <InvoiceExtrasEditor value={extras} onChange={setExtras} baseSubtotal={baseSubtotal} currency={currency} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              Guardar
            </Button>
          </div>
          {saveMutation.error ? (
            <div className="mt-2">
              <ErrorNote error={saveMutation.error} />
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
