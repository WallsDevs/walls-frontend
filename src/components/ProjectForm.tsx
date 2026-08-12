import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rest } from '../lib/api'
import { PROJECT_STATUS_LABELS } from '../lib/labels'
import { Button, Field, Input, Modal, Select, Textarea, ErrorNote } from './ui'

const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7', '#e34948', '#0f172a']

const emptyForm = {
  name: '',
  description: '',
  status: 'active',
  startDate: '',
  endDate: '',
  color: COLORS[0],
  client: '',
}

export default function ProjectForm({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project?: any | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm)

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => rest.list('clients', { sort: 'name:asc', pagination: { pageSize: 100 } }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        color: project.color || COLORS[0],
        client: project.client?.documentId || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, project])

  const mutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        name: form.name,
        description: form.description || null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        color: form.color,
        client: form.client || null,
      }
      if (project) return rest.update('projects', project.documentId, data)
      return rest.create('projects', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project'] })
      onClose()
    },
  })

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Editar proyecto' : 'Nuevo proyecto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.name}>
            {project ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre del proyecto *">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="FairPay App" />
        </Field>
        <Field label="Cliente">
          <Select value={form.client} onChange={(e) => set('client', e.target.value)}>
            <option value="">Sin cliente</option>
            {(clients || []).map((c: any) => (
              <option key={c.documentId} value={c.documentId}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Estado">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Inicio">
            <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Fin (estimado)">
            <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </Field>
        </div>
        <Field label="Color">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={`size-7 rounded-full border-2 transition-transform ${form.color === c ? 'scale-110 border-slate-900' : 'border-transparent'}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}
