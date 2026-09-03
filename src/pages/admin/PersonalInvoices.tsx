import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, money, todayISO } from '../../lib/format'
import { INVOICE_STATUS_LABELS } from '../../lib/labels'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  PageLoader,
  TableWrap,
  Td,
  Th,
  INVOICE_STATUS_TONES,
} from '../../components/ui'

export default function PersonalInvoices() {
  const qc = useQueryClient()
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
          <Link to="/personal-invoices/new">
            <Button icon={Plus}>Nueva factura</Button>
          </Link>
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
            <Link to="/personal-invoices/new">
              <Button icon={Plus}>Nueva factura</Button>
            </Link>
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
                    <Link to={`/personal-invoices/${inv.documentId}/edit`}>
                      <Button size="sm" variant="ghost" icon={Pencil}>
                        Editar
                      </Button>
                    </Link>
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
