import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rest } from '../lib/api'
import { Button, ErrorNote, Field, Input, Modal, Textarea } from './ui'
import PaymentMethodsEditor, { type PaymentMethod } from './PaymentMethodsEditor'

const CARGOS_SUGERIDOS = ['CEO', 'Administradora', 'Contadora', 'Project Manager', 'Diseñador', 'Comercial']

const emptyForm = {
  firstName: '',
  lastName: '',
  cargo: '',
  email: '',
  cedula: '',
  monthlySalary: '',
  active: true,
  notes: '',
}

export default function StaffForm({
  open,
  onClose,
  member,
}: {
  open: boolean
  onClose: () => void
  member?: any | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm)
  const [methods, setMethods] = useState<PaymentMethod[]>([])

  useEffect(() => {
    if (!open) return
    if (member) {
      setForm({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        cargo: member.cargo || '',
        email: member.email || '',
        cedula: member.cedula || '',
        monthlySalary: member.monthlySalary ?? '',
        active: member.active ?? true,
        notes: member.notes || '',
      })
      setMethods(
        (member.paymentMethods || []).map((m: any) => ({
          type: m.type,
          accountName: m.accountName || '',
          details: m.details || '',
          preferred: !!m.preferred,
        })),
      )
    } else {
      setForm(emptyForm)
      setMethods([{ type: 'bancolombia', accountName: '', details: '', preferred: true }])
    }
  }, [open, member])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        email: form.email || null,
        monthlySalary: Number(form.monthlySalary) || 0,
        paymentMethods: methods.map((m) => ({ ...m })),
      }
      if (member) return rest.update('staff-members', member.documentId, data)
      return rest.create('staff-members', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Editar integrante' : 'Nuevo integrante del equipo interno'}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!form.firstName || !form.lastName || !form.cargo || form.monthlySalary === ''}
          >
            {member ? 'Guardar cambios' : 'Crear integrante'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombres *">
          <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Laura" />
        </Field>
        <Field label="Apellidos *">
          <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Mendoza" />
        </Field>
        <Field label="Cargo *">
          <Input value={form.cargo} onChange={(e) => set('cargo', e.target.value)} list="cargos-sugeridos" placeholder="Administradora, CEO…" />
          <datalist id="cargos-sugeridos">
            {CARGOS_SUGERIDOS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Sueldo mensual (USD) *">
          <Input
            type="number"
            min={0}
            step="50"
            value={form.monthlySalary}
            onChange={(e) => set('monthlySalary', e.target.value)}
            placeholder="800"
          />
        </Field>
        <Field label="Correo electrónico">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Cédula">
          <Input value={form.cedula} onChange={(e) => set('cedula', e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <PaymentMethodsEditor methods={methods} onChange={setMethods} />
      </div>

      <Field label="Notas" className="mt-4">
        <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
          className="size-4 accent-brand-500"
        />
        Activo (se incluye en la nómina mensual)
      </label>

      {mutation.error ? <div className="mt-3"><ErrorNote error={mutation.error} /></div> : null}
    </Modal>
  )
}
