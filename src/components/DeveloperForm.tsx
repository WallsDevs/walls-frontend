import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rest } from '../lib/api'
import { Button, Field, Input, Modal, Select, Textarea, ErrorNote } from './ui'
import PaymentMethodsEditor, { type PaymentMethod } from './PaymentMethodsEditor'

const emptyForm = {
  firstName: '',
  lastName: '',
  cedula: '',
  email: '',
  github: '',
  level: 'mid',
  availability: 'full_time',
  hoursPerWeek: 40,
  active: true,
  notes: '',
}

export default function DeveloperForm({
  open,
  onClose,
  developer,
}: {
  open: boolean
  onClose: () => void
  developer?: any | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm)
  const [techs, setTechs] = useState<string[]>([])
  const [techInput, setTechInput] = useState('')
  const [methods, setMethods] = useState<PaymentMethod[]>([])

  useEffect(() => {
    if (!open) return
    if (developer) {
      setForm({
        firstName: developer.firstName || '',
        lastName: developer.lastName || '',
        cedula: developer.cedula || '',
        email: developer.email || '',
        github: developer.github || '',
        level: developer.level || 'mid',
        availability: developer.availability || 'full_time',
        hoursPerWeek: developer.hoursPerWeek ?? 40,
        active: developer.active ?? true,
        notes: developer.notes || '',
      })
      setTechs(Array.isArray(developer.technologies) ? developer.technologies : [])
      setMethods(
        (developer.paymentMethods || []).map((m: any) => ({
          type: m.type,
          accountName: m.accountName || '',
          details: m.details || '',
          preferred: !!m.preferred,
        })),
      )
    } else {
      setForm(emptyForm)
      setTechs([])
      setMethods([{ type: 'bancolombia', accountName: '', details: '', preferred: true }])
    }
    setTechInput('')
  }, [open, developer])

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        hoursPerWeek: Number(form.hoursPerWeek) || null,
        technologies: techs,
        paymentMethods: methods.map((m) => ({ ...m })),
      }
      if (developer) return rest.update('developers', developer.documentId, data)
      return rest.create('developers', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['developers'] })
      qc.invalidateQueries({ queryKey: ['developer'] })
      onClose()
    },
  })

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const addTech = () => {
    const t = techInput.trim()
    if (t && !techs.includes(t)) setTechs([...techs, t])
    setTechInput('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={developer ? 'Editar developer' : 'Nuevo developer'}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!form.firstName || !form.lastName || !form.email}
          >
            {developer ? 'Guardar cambios' : 'Crear developer'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombres *">
          <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="María" />
        </Field>
        <Field label="Apellidos *">
          <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="García" />
        </Field>
        <Field label="Cédula">
          <Input value={form.cedula} onChange={(e) => set('cedula', e.target.value)} placeholder="1.045.221.333" />
        </Field>
        <Field label="Correo electrónico *">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="dev@correo.com" />
        </Field>
        <Field label="Cuenta de GitHub">
          <Input value={form.github} onChange={(e) => set('github', e.target.value)} placeholder="usuario-github" />
        </Field>
        <Field label="Nivel">
          <Select value={form.level} onChange={(e) => set('level', e.target.value)}>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </Select>
        </Field>
        <Field label="Disponibilidad">
          <Select value={form.availability} onChange={(e) => set('availability', e.target.value)}>
            <option value="full_time">Tiempo completo</option>
            <option value="part_time">Medio tiempo</option>
            <option value="unavailable">No disponible</option>
          </Select>
        </Field>
        <Field label="Horas por semana">
          <Input
            type="number"
            min={0}
            max={60}
            value={form.hoursPerWeek}
            onChange={(e) => set('hoursPerWeek', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Tecnologías" className="mt-4" hint="Escribe y presiona Enter para agregar">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {techs.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700"
              >
                {t}
                <button
                  type="button"
                  onClick={() => setTechs(techs.filter((x) => x !== t))}
                  className="text-brand-400 hover:text-brand-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <Input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTech()
              }
            }}
            onBlur={addTech}
            placeholder="React, Node.js…"
          />
        </div>
      </Field>

      <div className="mt-4">
        <PaymentMethodsEditor methods={methods} onChange={setMethods} />
      </div>

      <Field label="Notas" className="mt-4">
        <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notas internas…" />
      </Field>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
          className="size-4 accent-brand-500"
        />
        Developer activo
      </label>

      {mutation.error ? <div className="mt-3"><ErrorNote error={mutation.error} /></div> : null}
    </Modal>
  )
}
