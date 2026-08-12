import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { rest } from '../lib/api'
import { fmtDate, hours, todayISO } from '../lib/format'
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../lib/labels'
import { Badge, Button, ConfirmDialog, Field, Input, Modal, Select, Textarea, ErrorNote } from './ui'

const emptyForm = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  estimateHours: '',
  dueDate: '',
  assignee: '',
  project: '',
}

/**
 * Crear/editar tarea. Si recibe projectId fijo, la tarea pertenece a ese proyecto;
 * si no (vista global), permite escoger proyecto. En edición muestra las horas registradas
 * y permite al admin registrar horas a nombre de un dev del equipo.
 */
export default function TaskModal({
  open,
  onClose,
  task,
  projectId,
}: {
  open: boolean
  onClose: () => void
  task?: any | null
  projectId?: string
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [entry, setEntry] = useState({ developer: '', date: todayISO(), hours: '', description: '' })

  const effectiveProject = projectId || form.project

  const { data: projects } = useQuery({
    queryKey: ['projects-min'],
    queryFn: () => rest.list('projects', { sort: 'name:asc', pagination: { pageSize: 100 } }),
    enabled: open && !projectId,
  })

  const { data: team } = useQuery({
    queryKey: ['project-team', effectiveProject],
    queryFn: () =>
      rest.list('assignments', {
        filters: { project: { documentId: { $eq: effectiveProject } } },
        populate: { developer: true },
        pagination: { pageSize: 100 },
      }),
    enabled: open && !!effectiveProject,
  })

  const { data: entries } = useQuery({
    queryKey: ['task-entries', task?.documentId],
    queryFn: () =>
      rest.list('time-entries', {
        filters: { task: { documentId: { $eq: task.documentId } } },
        populate: { developer: true },
        sort: 'date:desc',
        pagination: { pageSize: 50 },
      }),
    enabled: open && !!task,
  })

  useEffect(() => {
    if (!open) return
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        estimateHours: task.estimateHours ?? '',
        dueDate: task.dueDate || '',
        assignee: task.assignee?.documentId || '',
        project: task.project?.documentId || projectId || '',
      })
    } else {
      setForm({ ...emptyForm, project: projectId || '' })
    }
    setEntry({ developer: '', date: todayISO(), hours: '', description: '' })
  }, [open, task, projectId])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['project'] })
    qc.invalidateQueries({ queryKey: ['projects'] })
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['task-entries'] })
    qc.invalidateQueries({ queryKey: ['project-entries'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        estimateHours: form.estimateHours === '' ? null : Number(form.estimateHours),
        dueDate: form.dueDate || null,
        assignee: form.assignee || null,
        project: effectiveProject,
      }
      if (task) return rest.update('tasks', task.documentId, data)
      return rest.create('tasks', data)
    },
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => rest.remove('tasks', task.documentId),
    onSuccess: () => {
      invalidate()
      setConfirmDelete(false)
      onClose()
    },
  })

  const entryMutation = useMutation({
    mutationFn: () =>
      rest.create('time-entries', {
        task: task.documentId,
        project: effectiveProject,
        developer: entry.developer,
        date: entry.date,
        hours: Number(entry.hours),
        description: entry.description || null,
        billed: false,
      }),
    onSuccess: () => {
      invalidate()
      setEntry({ developer: '', date: todayISO(), hours: '', description: '' })
    },
  })

  const totalLogged = (entries || []).reduce((s: number, e: any) => s + Number(e.hours || 0), 0)

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={task ? 'Editar tarea' : 'Nueva tarea'}
        wide
        footer={
          <>
            {task ? (
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)} className="mr-auto">
                Eliminar
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!form.title || !effectiveProject}
            >
              {task ? 'Guardar cambios' : 'Crear tarea'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!projectId && (
            <Field label="Proyecto *">
              <Select value={form.project} onChange={(e) => set('project', e.target.value)} disabled={!!task}>
                <option value="">Selecciona…</option>
                {(projects || []).map((p: any) => (
                  <option key={p.documentId} value={p.documentId}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Título *">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Integrar pasarela de pagos" />
          </Field>
          <Field label="Descripción">
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Estado">
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prioridad">
              <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estimado (h)">
              <Input type="number" min={0} step="0.5" value={form.estimateHours} onChange={(e) => set('estimateHours', e.target.value)} />
            </Field>
            <Field label="Fecha límite">
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </Field>
          </div>
          <Field label="Asignada a" hint={!effectiveProject ? 'Escoge primero el proyecto' : undefined}>
            <Select value={form.assignee} onChange={(e) => set('assignee', e.target.value)} disabled={!effectiveProject}>
              <option value="">Sin asignar</option>
              {(team || [])
                .filter((a: any) => a.developer)
                .map((a: any) => (
                  <option key={a.developer.documentId} value={a.developer.documentId}>
                    {a.developer.firstName} {a.developer.lastName} · {a.role}
                  </option>
                ))}
            </Select>
          </Field>

          {saveMutation.error ? <ErrorNote error={saveMutation.error} /> : null}

          {task ? (
            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horas registradas</h3>
                <span className="text-xs font-semibold text-slate-700">{hours(totalLogged)}</span>
              </div>
              <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto">
                {(entries || []).map((e: any) => (
                  <li key={e.documentId} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-20 shrink-0 text-xs text-slate-400">{fmtDate(e.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-600">
                      {e.developer ? `${e.developer.firstName} ${e.developer.lastName}` : '—'}
                      {e.description ? ` · ${e.description}` : ''}
                    </span>
                    <span className="shrink-0 font-medium">{hours(e.hours)}</span>
                    {e.billed ? <Badge tone="green">Facturada</Badge> : null}
                  </li>
                ))}
                {!(entries || []).length && (
                  <li className="px-4 py-4 text-center text-xs text-slate-400">Sin horas registradas.</li>
                )}
              </ul>
              <div className="border-t border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Registrar horas (como admin)</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_120px_80px_auto]">
                  <Select value={entry.developer} onChange={(e) => setEntry({ ...entry, developer: e.target.value })}>
                    <option value="">Developer…</option>
                    {(team || [])
                      .filter((a: any) => a.developer)
                      .map((a: any) => (
                        <option key={a.developer.documentId} value={a.developer.documentId}>
                          {a.developer.firstName} {a.developer.lastName}
                        </option>
                      ))}
                  </Select>
                  <Input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
                  <Input
                    type="number"
                    min={0.5}
                    max={24}
                    step="0.5"
                    placeholder="Horas"
                    value={entry.hours}
                    onChange={(e) => setEntry({ ...entry, hours: e.target.value })}
                  />
                  <Button
                    size="sm"
                    onClick={() => entryMutation.mutate()}
                    loading={entryMutation.isPending}
                    disabled={!entry.developer || !entry.hours}
                  >
                    Agregar
                  </Button>
                </div>
                {entryMutation.error ? <div className="mt-2"><ErrorNote error={entryMutation.error} /></div> : null}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Eliminar tarea"
        message="Se eliminará la tarea. Las horas registradas quedarán sin tarea asociada."
      />
    </>
  )
}
