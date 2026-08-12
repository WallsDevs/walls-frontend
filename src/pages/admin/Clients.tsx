import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import {

  Button,
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
} from '../../components/ui'
import AccountModal from '../../components/AccountModal'

const emptyForm = { name: '', contactName: '', email: '', phone: '', taxId: '', notes: '', active: true }

function ClientForm({ open, onClose, client }: { open: boolean; onClose: () => void; client?: any | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(
      client
        ? {
            name: client.name || '',
            contactName: client.contactName || '',
            email: client.email || '',
            phone: client.phone || '',
            taxId: client.taxId || '',
            notes: client.notes || '',
            active: client.active ?? true,
          }
        : emptyForm,
    )
  }, [open, client])

  const mutation = useMutation({
    mutationFn: () =>
      client ? rest.update('clients', client.documentId, form) : rest.create('clients', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      onClose()
    },
  })

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.name}>
            {client ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Empresa / nombre *">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="FairPay" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Persona de contacto">
            <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Correo">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="NIT / ID fiscal">
            <Input value={form.taxId} onChange={(e) => set('taxId', e.target.value)} />
          </Field>
        </div>
        <Field label="Notas">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="size-4 accent-brand-500" />
          Cliente activo
        </label>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

export default function Clients() {
  const qc = useQueryClient()
  const [formModal, setFormModal] = useState<{ open: boolean; client?: any }>({ open: false })
  const [accessFor, setAccessFor] = useState<any | null>(null)
  const [deleting, setDeleting] = useState<any | null>(null)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () =>
      rest.list('clients', {
        populate: { user: true, projects: true, invoices: true },
        sort: 'name:asc',
        pagination: { pageSize: 100 },
      }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => rest.remove('clients', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setDeleting(null)
    },
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clients?.length || 0} en total`}
        actions={
          <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
            Nuevo cliente
          </Button>
        }
      />

      {!clients?.length ? (
        <EmptyState
          icon={Building2}
          title="No hay clientes"
          description="Crea un cliente para poder asociarlo a proyectos y facturas."
          action={
            <Button icon={Plus} onClick={() => setFormModal({ open: true })}>
              Nuevo cliente
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Contacto</Th>
              <Th right>Proyectos</Th>
              <Th right>Facturas</Th>
              <Th>Portal</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {clients.map((c: any) => (
              <tr key={c.documentId} className="hover:bg-slate-50">
                <Td>
                  <p className={`font-medium ${c.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{c.name}</p>
                  <p className="text-xs text-slate-400">{c.taxId}</p>
                </Td>
                <Td>
                  <p className="text-slate-700">{c.contactName || '—'}</p>
                  <p className="text-xs text-slate-400">
                    {c.email} {c.phone ? `· ${c.phone}` : ''}
                  </p>
                </Td>
                <Td right>{(c.projects || []).length}</Td>
                <Td right>{(c.invoices || []).length}</Td>
                <Td>
                  {c.user ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <KeyRound size={12} /> Con acceso
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => setAccessFor(c)}>
                      Crear acceso
                    </Button>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setFormModal({ open: true, client: c })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleting(c)}
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

      <ClientForm open={formModal.open} onClose={() => setFormModal({ open: false })} client={formModal.client} />
      {accessFor ? (
        <AccountModal
          open={!!accessFor}
          onClose={() => setAccessFor(null)}
          type="client"
          profileId={accessFor.documentId}
          defaultEmail={accessFor.email}
          name={accessFor.name}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeMutation.mutate(deleting.documentId)}
        loading={removeMutation.isPending}
        title="Eliminar cliente"
        message={`¿Eliminar a ${deleting?.name}? Sus proyectos quedarán sin cliente asociado.`}
      />
    </div>
  )
}
