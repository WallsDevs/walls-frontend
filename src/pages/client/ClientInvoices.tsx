import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, FileText } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, hours, money } from '../../lib/format'
import { INVOICE_STATUS_LABELS } from '../../lib/labels'
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Modal,
  PageHeader,
  PageLoader,
  TableWrap,
  Td,
  Th,
  INVOICE_STATUS_TONES,
} from '../../components/ui'

export default function ClientInvoices() {
  const [detail, setDetail] = useState<any | null>(null)

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: () => api('/me/invoices'),
  })

  if (isLoading) return <PageLoader />
  if (error) return <ErrorNote error={error} />

  return (
    <div>
      <PageHeader title="Facturas" subtitle="Facturas emitidas por Walls para tus proyectos" />

      {!(invoices || []).length ? (
        <EmptyState
          icon={FileText}
          title="No hay facturas disponibles"
          description="Cuando la agencia emita una factura la verás aquí."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Número</Th>
              <Th>Proyecto</Th>
              <Th>Emitida</Th>
              <Th>Período</Th>
              <Th right>Total</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {(invoices || []).map((inv: any) => (
              <tr key={inv.documentId} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-900">{inv.number}</Td>
                <Td>{inv.project || '—'}</Td>
                <Td className="whitespace-nowrap text-slate-500">{fmtDate(inv.issuedDate)}</Td>
                <Td className="whitespace-nowrap text-slate-500">
                  {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                </Td>
                <Td right className="font-semibold">{money(inv.total, inv.currency)}</Td>
                <Td>
                  <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => setDetail(inv)}>
                      Ver
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Factura ${detail?.number || ''}`} wide>
        {detail ? (
          <div>
            <p className="mb-4 text-sm text-slate-500">
              {detail.project} · Período {fmtDate(detail.periodStart)} – {fmtDate(detail.periodEnd)}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Concepto</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Horas</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Importe</th>
                </tr>
              </thead>
              <tbody>
                {(detail.lines || []).map((l: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2.5 text-slate-800">{l.description}</td>
                    <td className="py-2.5 text-right text-slate-500">{l.kind === 'hourly' ? hours(l.hours) : '—'}</td>
                    <td className="py-2.5 text-right font-medium">{money(l.amount, detail.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-between rounded-lg bg-slate-900 px-4 py-3 text-sm text-white">
              <span>Total</span>
              <span className="font-semibold">{money(detail.total, detail.currency)}</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
