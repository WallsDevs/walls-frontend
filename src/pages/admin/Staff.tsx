import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import { money } from '../../lib/format'
import { PAYMENT_TYPE_LABELS } from '../../lib/labels'
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  PageLoader,
  TableWrap,
  Td,
  Th,
} from '../../components/ui'
import StaffForm from '../../components/StaffForm'

export default function Staff() {
  const qc = useQueryClient()
  const [formModal, setFormModal] = useState<{ open: boolean; member?: any }>({ open: false })
  const [deleting, setDeleting] = useState<any | null>(null)

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () =>
      rest.list('staff-members', {
        populate: { paymentMethods: true },
        sort: 'firstName:asc',
        pagination: { pageSize: 100 },
      }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => rest.remove('staff-members', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      setDeleting(null)
    },
  })

  if (isLoading) return <PageLoader />

  const activeTotal = (staff || [])
    .filter((s: any) => s.active)
    .reduce((sum: number, s: any) => sum + Number(s.monthlySalary || 0), 0)

  return (
    <div>
      <PageHeader
        title="Equipo interno"
        subtitle="Personal administrativo con sueldo mensual — no factura por proyecto"
        actions={
          <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
            Nuevo integrante
          </Button>
        }
      />

      {!(staff || []).length ? (
        <EmptyState
          icon={Briefcase}
          title="Sin personal interno"
          description="Registra a la administradora, CEO y demás personal con sueldo fijo. Luego genera su nómina mensual desde Facturación → Nómina interna."
          action={
            <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
              Nuevo integrante
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-slate-200">
            <span className="text-slate-500">Nómina mensual (activos):</span>
            <span className="font-semibold text-slate-900">{money(activeTotal)}</span>
          </div>
          <TableWrap>
            <thead>
              <tr>
                <Th>Integrante</Th>
                <Th>Cargo</Th>
                <Th>Contacto</Th>
                <Th right>Sueldo mensual</Th>
                <Th>Pago</Th>
                <Th>Estado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {(staff || []).map((s: any) => {
                const name = `${s.firstName} ${s.lastName}`
                const preferred = (s.paymentMethods || []).find((m: any) => m.preferred) || s.paymentMethods?.[0]
                return (
                  <tr key={s.documentId} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={name} />
                        <span className={`font-medium ${s.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {name}
                        </span>
                      </div>
                    </Td>
                    <Td>{s.cargo}</Td>
                    <Td>
                      <p className="text-xs text-slate-500">
                        {s.email || '—'}
                        {s.cedula ? ` · CC ${s.cedula}` : ''}
                      </p>
                    </Td>
                    <Td right className="font-semibold">{money(s.monthlySalary)}</Td>
                    <Td>
                      <span className="text-xs text-slate-500">
                        {preferred ? PAYMENT_TYPE_LABELS[preferred.type] || preferred.type : '—'}
                      </span>
                    </Td>
                    <Td>{s.active ? <Badge tone="green">Activo</Badge> : <Badge tone="gray">Inactivo</Badge>}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setFormModal({ open: true, member: s })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleting(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        </>
      )}

      <StaffForm open={formModal.open} onClose={() => setFormModal({ open: false })} member={formModal.member} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeMutation.mutate(deleting.documentId)}
        loading={removeMutation.isPending}
        title="Eliminar integrante"
        message={`¿Eliminar a ${deleting?.firstName} ${deleting?.lastName}? Las nóminas ya generadas no se modifican.`}
      />
    </div>
  )
}
