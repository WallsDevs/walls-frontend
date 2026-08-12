import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, hours, money } from '../../lib/format'
import { INVOICE_STATUS_LABELS } from '../../lib/labels'
import { Badge, Button, Card, ErrorNote, PageLoader, INVOICE_STATUS_TONES } from '../../components/ui'

export default function InvoicePage() {
  const { documentId = '' } = useParams()
  const qc = useQueryClient()

  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoice', documentId],
    queryFn: () =>
      rest.one('invoices', documentId, {
        populate: { project: true, client: true, paymentReport: true },
      }),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => rest.update('invoices', documentId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', documentId] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  if (isLoading) return <PageLoader />
  if (error || !inv) return <ErrorNote error={error || new Error('Factura no encontrada')} />

  const lines = inv.lines || []

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/billing?tab=invoices" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Facturas
        </Link>
        <div className="flex gap-2">
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

      <Card className="print-area mx-auto max-w-3xl p-8 sm:p-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white">
                W
              </div>
              <div>
                <p className="font-semibold text-slate-900">Walls</p>
                <p className="text-xs text-slate-500">Agencia de desarrollo web</p>
              </div>
            </div>
          </div>
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
            <p className="font-medium text-slate-900">{inv.client?.name || '—'}</p>
            <p className="text-slate-500">{inv.client?.contactName}</p>
            <p className="text-slate-500">{inv.client?.email}</p>
            <p className="text-slate-500">{inv.client?.taxId}</p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Detalles</p>
            <p className="text-slate-600">
              Proyecto: <span className="font-medium text-slate-900">{inv.project?.name}</span>
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
              <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Horas</th>
              <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tarifa</th>
              <th className="py-2 pl-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Importe</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2.5 pr-2">
                  <p className="font-medium text-slate-900">{l.description}</p>
                </td>
                <td className="px-2 py-2.5 text-right text-slate-600">
                  {l.kind === 'hourly' ? hours(l.hours) : '—'}
                </td>
                <td className="px-2 py-2.5 text-right text-slate-600">
                  {l.kind === 'hourly' ? `${money(l.rate)}/h` : 'Fija'}
                </td>
                <td className="py-2.5 pl-2 text-right font-medium text-slate-900">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-8 flex justify-end">
          <div className="w-56">
            <div className="flex justify-between border-t-2 border-slate-900 py-2 text-base font-semibold text-slate-900">
              <span>Total {inv.currency}</span>
              <span>{money(inv.total, inv.currency)}</span>
            </div>
          </div>
        </div>

        {inv.notes ? <p className="text-xs text-slate-500">Notas: {inv.notes}</p> : null}
        <p className="mt-6 text-center text-xs text-slate-400">Gracias por confiar en Walls.</p>
      </Card>
    </div>
  )
}
