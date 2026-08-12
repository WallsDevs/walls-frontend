import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rest } from '../lib/api'
import { Button, Field, Input, Modal, Select, ErrorNote } from './ui'

const ROLES_SUGERIDOS = ['Backend', 'Frontend', 'Fullstack', 'Team Lead', 'Tech Lead', 'QA', 'DevOps', 'Diseño UI/UX']

const emptyForm = {
  developer: '',
  role: 'Backend',
  billingType: 'hourly',
  devHourlyRate: '',
  clientHourlyRate: '',
  devMonthlyAmount: '',
  clientMonthlyAmount: '',
  active: true,
  startDate: '',
}

export default function AssignmentForm({
  open,
  onClose,
  projectId,
  assignment,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  assignment?: any | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm)

  const { data: devs } = useQuery({
    queryKey: ['developers'],
    queryFn: () =>
      rest.list('developers', {
        populate: { paymentMethods: true, user: true, assignments: { populate: { project: true } } },
        sort: 'firstName:asc',
        pagination: { pageSize: 100 },
      }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    if (assignment) {
      setForm({
        developer: assignment.developer?.documentId || '',
        role: assignment.role || '',
        billingType: assignment.billingType || 'hourly',
        devHourlyRate: assignment.devHourlyRate ?? '',
        clientHourlyRate: assignment.clientHourlyRate ?? '',
        devMonthlyAmount: assignment.devMonthlyAmount ?? '',
        clientMonthlyAmount: assignment.clientMonthlyAmount ?? '',
        active: assignment.active ?? true,
        startDate: assignment.startDate || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, assignment])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))
  const num = (v: string) => (v === '' || v === null ? null : Number(v))

  const hourly = form.billingType === 'hourly'
  const margin = hourly
    ? (Number(form.clientHourlyRate) || 0) - (Number(form.devHourlyRate) || 0)
    : (Number(form.clientMonthlyAmount) || 0) - (Number(form.devMonthlyAmount) || 0)

  const mutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        project: projectId,
        developer: form.developer,
        role: form.role,
        billingType: form.billingType,
        devHourlyRate: hourly ? num(form.devHourlyRate) : null,
        clientHourlyRate: hourly ? num(form.clientHourlyRate) : null,
        devMonthlyAmount: !hourly ? num(form.devMonthlyAmount) : null,
        clientMonthlyAmount: !hourly ? num(form.clientMonthlyAmount) : null,
        active: form.active,
        startDate: form.startDate || null,
      }
      if (assignment) return rest.update('assignments', assignment.documentId, data)
      return rest.create('assignments', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['unbilled'] })
      onClose()
    },
  })

  const valid =
    form.developer &&
    form.role &&
    (hourly
      ? form.devHourlyRate !== '' && form.clientHourlyRate !== ''
      : form.devMonthlyAmount !== '' && form.clientMonthlyAmount !== '')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignment ? 'Editar asignación' : 'Asignar developer'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!valid}>
            {assignment ? 'Guardar cambios' : 'Asignar al proyecto'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Developer *">
          <Select value={form.developer} onChange={(e) => set('developer', e.target.value)} disabled={!!assignment}>
            <option value="">Selecciona…</option>
            {(devs || []).map((d: any) => (
              <option key={d.documentId} value={d.documentId}>
                {d.firstName} {d.lastName} · {d.level}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Rol en este proyecto *" hint="El mismo dev puede tener roles distintos por proyecto">
          <Input value={form.role} onChange={(e) => set('role', e.target.value)} list="roles-sugeridos" placeholder="Backend, Team Lead…" />
          <datalist id="roles-sugeridos">
            {ROLES_SUGERIDOS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>

        <Field label="Esquema de pago en este proyecto *">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('billingType', 'hourly')}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${hourly ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              <span className="block font-medium">Por hora</span>
              <span className="text-xs opacity-70">Se factura según horas registradas</span>
            </button>
            <button
              type="button"
              onClick={() => set('billingType', 'fixed')}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${!hourly ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              <span className="block font-medium">Tarifa fija mensual</span>
              <span className="text-xs opacity-70">Monto fijo sin importar las horas</span>
            </button>
          </div>
        </Field>

        {hourly ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pago al dev (USD/hora) *">
              <Input type="number" min={0} step="0.5" value={form.devHourlyRate} onChange={(e) => set('devHourlyRate', e.target.value)} placeholder="3" />
            </Field>
            <Field label="Cobro al cliente (USD/hora) *">
              <Input type="number" min={0} step="0.5" value={form.clientHourlyRate} onChange={(e) => set('clientHourlyRate', e.target.value)} placeholder="7" />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sueldo del dev (USD/mes) *">
              <Input type="number" min={0} value={form.devMonthlyAmount} onChange={(e) => set('devMonthlyAmount', e.target.value)} placeholder="800" />
            </Field>
            <Field label="Cobro al cliente (USD/mes) *">
              <Input type="number" min={0} value={form.clientMonthlyAmount} onChange={(e) => set('clientMonthlyAmount', e.target.value)} placeholder="1000" />
            </Field>
          </div>
        )}

        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Margen de la agencia: <span className="font-semibold">${margin.toFixed(2)}</span>
          {hourly ? ' por hora facturada' : ' fijo al mes'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de inicio">
            <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="size-4 accent-brand-500" />
            Asignación activa
          </label>
        </div>

        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}
