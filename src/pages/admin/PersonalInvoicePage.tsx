import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, money, todayISO } from '../../lib/format'
import { INVOICE_STATUS_LABELS } from '../../lib/labels'
import { Badge, Button, Card, ErrorNote, PageLoader, INVOICE_STATUS_TONES } from '../../components/ui'
import wordmark from '../../assets/brand/logo-wordmark-black.svg'

export default function PersonalInvoicePage() {
  const { documentId = '' } = useParams()
  const qc = useQueryClient()

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['personal-invoice', documentId],
    queryFn: () => rest.one('personal-invoices', documentId),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      rest.update('personal-invoices', documentId, { status, paidDate: status === 'paid' ? todayISO() : null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-invoice', documentId] })
      qc.invalidateQueries({ queryKey: ['personal-invoices'] })
    },
  })

  if (isLoading) return <PageLoader />
  if (error || !inv) return <ErrorNote error={error || new Error('Factura no encontrada')} />

  const lines = inv.lines || []

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/personal-invoices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Facturas propias
        </Link>
        <div className="flex gap-2">
          {inv.status === 'draft' && (
            <Button variant="secondary" onClick={() => statusMutation.mutate('sent')} loading={statusMutation.isPending}>
              Marcar enviada
            </Button>
          )}
          {inv.status === 'sent' && (
            <Button variant="secondary" onClick={() => statusMutation.mutate('paid')} loading={statusMutation.isPending}>
              Marcar cobrada
            </Button>
          )}
          <Button icon={Printer} onClick={() => window.print()}>
            Imprimir / PDF
          </Button>
        </div>
      </div>

      <Card className="print-area mx-auto max-w-3xl p-8 sm:p-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <img src={wordmark} alt="Walls" className="h-6 w-auto" />
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{inv.number}</p>
            <div className="mt-1">
              <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Facturar a</p>
            <p className="font-medium text-slate-900">{inv.clientName}</p>
            {inv.clientTaxId ? <p className="text-slate-500">{inv.clientTaxId}</p> : null}
            {inv.clientEmail ? <p className="text-slate-500">{inv.clientEmail}</p> : null}
            {inv.clientAddress ? <p className="text-slate-500">{inv.clientAddress}</p> : null}
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Detalles</p>
            <p className="text-slate-600">Emitida: {fmtDate(inv.issuedDate)}</p>
            {inv.dueDate ? <p className="text-slate-600">Vence: {fmtDate(inv.dueDate)}</p> : null}
            {inv.paidDate ? <p className="text-slate-600">Pagada: {fmtDate(inv.paidDate)}</p> : null}
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
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2.5 pr-2 font-medium text-slate-900">{l.description}</td>
                <td className="px-2 py-2.5 text-right text-slate-600">{l.quantity}</td>
                <td className="px-2 py-2.5 text-right text-slate-600">{money(l.rate, inv.currency)}</td>
                <td className="py-2.5 pl-2 text-right font-medium text-slate-900">{money(l.amount, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-8 flex justify-end">
          <div className="w-56 text-sm">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Subtotal</span>
              <span>{money(inv.subtotal, inv.currency)}</span>
            </div>
            {Number(inv.taxRate) > 0 ? (
              <div className="flex justify-between py-1 text-slate-600">
                <span>Impuesto ({inv.taxRate}%)</span>
                <span>{money(inv.taxAmount, inv.currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t-2 border-slate-900 py-2 text-base font-semibold text-slate-900">
              <span>Total {inv.currency}</span>
              <span>{money(inv.total, inv.currency)}</span>
            </div>
          </div>
        </div>

        {inv.paymentInfo ? (
          <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-700">Datos de pago</p>
            <p className="whitespace-pre-line">{inv.paymentInfo}</p>
          </div>
        ) : null}
        {inv.notes ? <p className="text-xs text-slate-500">Notas: {inv.notes}</p> : null}
      </Card>
    </div>
  )
}
