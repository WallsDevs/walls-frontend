import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PRIORITY_LABELS } from '../../lib/labels'
import { Button, ErrorNote, Field, Input, Modal, Select, Textarea } from '../ui'

const emptyForm = { project: '', title: '', description: '', priority: 'medium', estimateHours: '', dueDate: '' }

export default function NewTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm)

  const { data: projects } = useQuery({
    queryKey: ['me-projects'],
    queryFn: () => api('/me/projects'),
    enabled: open,
  })

  useEffect(() => {
    if (open) setForm(emptyForm)
  }, [open])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () =>
      api('/me/tasks', {
        method: 'POST',
        body: {
          project: form.project,
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          estimateHours: form.estimateHours === '' ? undefined : Number(form.estimateHours),
          dueDate: form.dueDate || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-tasks'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva tarea"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.project || !form.title}>
            Crear tarea
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Proyecto *" hint="Solo ves los proyectos donde estás asignado">
          <Select value={form.project} onChange={(e) => set('project', e.target.value)}>
            <option value="">Selecciona…</option>
            {(projects || []).map((p: any) => (
              <option key={p.project.documentId} value={p.project.documentId}>
                {p.project.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Título *">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus />
        </Field>
        <Field label="Descripción">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalles, contexto…" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prioridad" className="col-span-1">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estimado (h)" className="col-span-1">
            <Input type="number" min={0} step="0.5" value={form.estimateHours} onChange={(e) => set('estimateHours', e.target.value)} />
          </Field>
          <Field label="Fecha límite" className="col-span-1">
            <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-slate-400">Se crea asignada a ti, con estado "Por hacer".</p>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}
