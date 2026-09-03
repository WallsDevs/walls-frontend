import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { rest } from '../../lib/api'
import { todayISO } from '../../lib/format'
import { Button, Card, ErrorNote, PageLoader } from '../../components/ui'
import PersonalInvoiceDoc from '../../components/PersonalInvoiceDoc'

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

      <Card className="print-area mx-auto max-w-3xl">
        <PersonalInvoiceDoc inv={inv} />
      </Card>
    </div>
  )
}
