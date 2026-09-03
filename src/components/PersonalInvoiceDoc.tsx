import { fmtDate, money } from '../lib/format'
import { INVOICE_STATUS_LABELS } from '../lib/labels'
import { Badge, INVOICE_STATUS_TONES } from './ui'
import wordmark from '../assets/brand/logo-wordmark-black.svg'

export type InvoiceDocData = {
  number?: string
  status?: string
  clientName?: string
  clientTaxId?: string
  clientEmail?: string
  clientAddress?: string
  issuedDate?: string
  dueDate?: string
  paidDate?: string
  currency?: string
  lines?: Array<{ description?: string; quantity?: number; rate?: number; amount?: number }>
  subtotal?: number
  taxRate?: number
  taxAmount?: number
  total?: number
  notes?: string
  paymentInfo?: string
}

/** El documento de la factura. Se usa igual en el preview del editor y en la vista imprimible. */
export default function PersonalInvoiceDoc({ inv }: { inv: InvoiceDocData }) {
  const lines = inv.lines || []
  const currency = inv.currency || 'USD'

  return (
    <div className="p-8 sm:p-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <img src={wordmark} alt="Walls" className="h-6 w-auto" />
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight text-slate-900">{inv.number || 'Borrador'}</p>
          {inv.status ? (
            <div className="mt-1">
              <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Facturar a</p>
          <p className="font-medium text-slate-900">{inv.clientName || <span className="text-slate-300">Cliente</span>}</p>
          {inv.clientTaxId ? <p className="text-slate-500">{inv.clientTaxId}</p> : null}
          {inv.clientEmail ? <p className="text-slate-500">{inv.clientEmail}</p> : null}
          {inv.clientAddress ? <p className="whitespace-pre-line text-slate-500">{inv.clientAddress}</p> : null}
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Detalles</p>
          {inv.issuedDate ? <p className="text-slate-600">Emitida: {fmtDate(inv.issuedDate)}</p> : null}
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
          {lines.length ? (
            lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2.5 pr-2 font-medium text-slate-900">
                  {l.description || <span className="text-slate-300">Concepto</span>}
                </td>
                <td className="px-2 py-2.5 text-right text-slate-600">{l.quantity}</td>
                <td className="px-2 py-2.5 text-right text-slate-600">{money(l.rate, currency)}</td>
                <td className="py-2.5 pl-2 text-right font-medium text-slate-900">{money(l.amount, currency)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-6 text-center text-xs text-slate-300">
                Agrega conceptos para verlos aquí
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mb-8 flex justify-end">
        <div className="w-56 text-sm">
          <div className="flex justify-between py-1 text-slate-600">
            <span>Subtotal</span>
            <span>{money(inv.subtotal, currency)}</span>
          </div>
          {Number(inv.taxRate) > 0 ? (
            <div className="flex justify-between py-1 text-slate-600">
              <span>Impuesto ({inv.taxRate}%)</span>
              <span>{money(inv.taxAmount, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-slate-900 py-2 text-base font-semibold text-slate-900">
            <span>Total {currency}</span>
            <span>{money(inv.total, currency)}</span>
          </div>
        </div>
      </div>

      {inv.paymentInfo ? (
        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="mb-1 font-semibold text-slate-700">Datos de pago</p>
          <p className="whitespace-pre-line">{inv.paymentInfo}</p>
        </div>
      ) : null}
      {inv.notes ? <p className="whitespace-pre-line text-xs text-slate-500">Notas: {inv.notes}</p> : null}
    </div>
  )
}
