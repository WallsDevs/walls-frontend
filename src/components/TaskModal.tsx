import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { rest } from '../lib/api'
import { fmtDate, hours, todayISO } from '../lib/format'
import { devName, PRIORITY_LABELS, TASK_KIND_LABELS, TASK_STATUS_LABELS, taskAssignees } from '../lib/labels'
import { Badge, Button, ConfirmDialog, Field, Input, Modal, MultiSelectChips, Select, Textarea, ErrorNote } from './ui'
import AttachmentsField, { type Attachment } from './AttachmentsField'
import MeetingLogForm from './MeetingLogForm'

const emptyForm = {
  title: '',
  kind: 'tarea',
  description: '',
  status: 'todo',
  priority: 'medium',
  estimateHours: '',
  dueDate: '',
  assignees: [] as string[],
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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [entry, setEntry] = useState({ developer: '', date: todayISO(), hours: '', description: '', kind: 'trabajo' })
  const [deleteEntry, setDeleteEntry] = useState<{ ids: string[]; label: string } | null>(null)

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
        kind: task.kind || 'tarea',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        estimateHours: task.estimateHours ?? '',
        dueDate: task.dueDate || '',
        assignees: taskAssignees(task).map((a) => a.documentId),
        project: task.project?.documentId || projectId || '',
      })
    } else {
      setForm({ ...emptyForm, project: projectId || '' })
    }
    setEntry({ developer: '', date: todayISO(), hours: '', description: '', kind: task?.kind === 'reunion' ? 'reunion' : 'trabajo' })
    setAttachments(
      (task?.attachments || []).map((a: any) => ({ id: a.id, url: a.url, name: a.name })),
    )
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
        kind: form.kind || 'tarea',
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        estimateHours: form.estimateHours === '' ? null : Number(form.estimateHours),
        dueDate: form.dueDate || null,
        assignees: form.assignees,
        project: effectiveProject,
        attachments: attachments.map((a) => a.id),
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
        kind: entry.kind,
      }),
    onSuccess: () => {
      invalidate()
      setEntry((e) => ({ ...e, developer: '', hours: '', description: '' }))
    },
  })

  // Borrar horas registradas por error (una entrada, o todas las de una reunión). Las facturadas no se tocan.
  const deleteEntriesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await rest.remove('time-entries', id)
    },
    onSuccess: () => {
      invalidate()
      setDeleteEntry(null)
    },
  })

  const totalLogged = (entries || []).reduce((s: number, e: any) => s + Number(e.hours || 0), 0)
  const meetingLogged = (entries || []).filter((e: any) => e.kind === 'reunion').reduce((s: number, e: any) => s + Number(e.hours || 0), 0)

  // Developers elegibles (equipo activo del proyecto) y los ya asignados, con nombre.
  const savedAssignees = task ? taskAssignees(task) : []
  const teamOptions = (team || [])
    .filter((a: any) => a.developer && a.active !== false)
    .map((a: any) => ({ value: a.developer.documentId, label: devName(a.developer), hint: a.role }))
  // Asignados que ya no están en el equipo (o la tarea no tiene proyecto): se muestran por nombre, no por id.
  const chipOptions = [
    ...teamOptions,
    ...savedAssignees.filter((a) => !teamOptions.some((o: any) => o.value === a.documentId)).map((a) => ({ value: a.documentId, label: a.name, hint: 'fuera del equipo' })),
  ]
  const assignedPeople = (form.assignees as string[])
    .map((id) => {
      const opt = teamOptions.find((o: any) => o.value === id)
      const fromTask = task ? taskAssignees(task).find((a) => a.documentId === id) : null
      return { documentId: id, name: opt?.label || fromTask?.name || id }
    })
  const isMeeting = form.kind === 'reunion'
  const missingProject = !!task && !task.project

  // Horas agrupadas: las de una misma reunión van juntas.
  const entryGroups = (() => {
    const groups: { key: string; meeting: boolean; date: string; description: string | null; items: any[] }[] = []
    const byGroup = new Map<string, (typeof groups)[number]>()
    for (const e of entries || []) {
      if (e.kind === 'reunion' && e.meetingGroup) {
        let g = byGroup.get(e.meetingGroup)
        if (!g) {
          g = { key: e.meetingGroup, meeting: true, date: e.date, description: e.description, items: [] }
          byGroup.set(e.meetingGroup, g)
          groups.push(g)
        }
        g.items.push(e)
      } else {
        groups.push({ key: e.documentId, meeting: false, date: e.date, description: e.description, items: [e] })
      }
    }
    return groups
  })()

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={task ? (isMeeting ? 'Editar reunión' : 'Editar tarea') : isMeeting ? 'Nueva reunión' : 'Nueva tarea'}
        size={task ? 'xl' : 'lg'}
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
        <div className={task ? 'grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]' : ''}>
        <div className={task ? 'space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200' : 'space-y-4'}>
          {missingProject ? (
            <ErrorNote error={new Error('Esta tarea no tiene proyecto. Elige uno y guarda para poder asignar developers y registrar horas.')} />
          ) : null}
          {!projectId && (
            <Field label="Proyecto *">
              <Select value={form.project} onChange={(e) => set('project', e.target.value)} disabled={!!task && !missingProject}>
                <option value="">Selecciona…</option>
                {(projects || []).map((p: any) => (
                  <option key={p.documentId} value={p.documentId}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-[9rem_1fr] gap-3">
            <Field label="Tipo">
              <Select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                {Object.entries(TASK_KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Título *">
              <Input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={isMeeting ? 'Daily, revisión de sprint, kickoff…' : 'Integrar pasarela de pagos'}
              />
            </Field>
          </div>
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
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">{isMeeting ? 'Participantes' : 'Asignados'}</p>
            <MultiSelectChips
              options={chipOptions}
              value={form.assignees}
              onChange={(v) => set('assignees', v)}
              disabled={!effectiveProject}
              placeholder={effectiveProject ? 'Agregar developer…' : 'Escoge primero el proyecto'}
              emptyText="Sin asignar"
            />
            <p className="mt-1 text-xs text-slate-400">Solo aparece el equipo con asignación activa en el proyecto.</p>
          </div>

          <Field label="Imágenes">
            <AttachmentsField value={attachments} onChange={setAttachments} />
          </Field>

          {saveMutation.error ? <ErrorNote error={saveMutation.error} /> : null}
        </div>

          {task ? (
            <div className="self-start overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horas registradas</h3>
                <span className="text-xs font-semibold text-slate-700">
                  {hours(totalLogged)}
                  {meetingLogged > 0 ? <span className="ml-1.5 font-normal text-violet-600">· {hours(meetingLogged)} en reuniones</span> : null}
                </span>
              </div>
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {entryGroups.map((g) =>
                  g.meeting ? (
                    <li key={g.key} className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-slate-400">{fmtDate(g.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-700">
                          <Badge tone="violet">Reunión</Badge>
                          <span className="ml-1.5">
                            {g.items.length} {g.items.length === 1 ? 'persona' : 'personas'} × {hours(g.items[0].hours)}
                          </span>
                          {g.description ? <span className="text-slate-500"> · {g.description}</span> : null}
                        </span>
                        <span className="shrink-0 font-medium">{hours(g.items.reduce((s: number, e: any) => s + Number(e.hours || 0), 0))}</span>
                        {g.items.every((e: any) => e.billed) ? (
                          <Badge tone="green">Facturada</Badge>
                        ) : (
                          <button
                            onClick={() =>
                              setDeleteEntry({
                                ids: g.items.filter((e: any) => !e.billed).map((e: any) => e.documentId),
                                label: `la reunión del ${fmtDate(g.date)} (${g.items.length} personas)`,
                              })
                            }
                            title="Eliminar esta reunión"
                            className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 pl-[5.75rem] text-xs text-slate-400">{g.items.map((e: any) => devName(e.developer)).join(', ')}</p>
                    </li>
                  ) : (
                    g.items.map((e: any) => (
                      <li key={e.documentId} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <span className="w-20 shrink-0 text-xs text-slate-400">{fmtDate(e.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-600">
                          {e.developer ? devName(e.developer) : '—'}
                          {e.description ? ` · ${e.description}` : ''}
                        </span>
                        {e.kind === 'reunion' ? <Badge tone="violet">Reunión</Badge> : null}
                        <span className="shrink-0 font-medium">{hours(e.hours)}</span>
                        {e.billed ? (
                          <Badge tone="green">Facturada</Badge>
                        ) : (
                          <button
                            onClick={() => setDeleteEntry({ ids: [e.documentId], label: `${hours(e.hours)} de ${devName(e.developer)} del ${fmtDate(e.date)}` })}
                            title="Eliminar estas horas"
                            className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </li>
                    ))
                  ),
                )}
                {!(entries || []).length && (
                  <li className="px-4 py-4 text-center text-xs text-slate-400">Sin horas registradas.</li>
                )}
              </ul>
              {isMeeting || savedAssignees.length > 1 ? (
                <div className="border-t border-slate-200 bg-violet-50/60 p-3">
                  <p className="mb-2 text-xs font-medium text-violet-700">Registrar reunión para varios participantes</p>
                  <MeetingLogForm
                    endpoint={`/tasks/${task.documentId}/meeting`}
                    participants={savedAssignees}
                    invalidateKeys={[['task-entries'], ['project-entries'], ['project'], ['projects'], ['dashboard'], ['tasks']]}
                  />
                  {savedAssignees.length !== assignedPeople.length ? (
                    <p className="mt-2 text-[11px] text-slate-400">Guarda los cambios de asignados para que aparezcan como participantes.</p>
                  ) : null}
                </div>
              ) : null}
              <div className="border-t border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">{isMeeting ? 'Registrar horas a una sola persona' : 'Registrar horas (como admin)'}</p>
                {missingProject ? (
                  <p className="text-xs text-amber-700">Asigna un proyecto a la tarea y guarda: las horas se registran a un developer del equipo de ese proyecto.</p>
                ) : effectiveProject && team && !teamOptions.length ? (
                  <p className="text-xs text-amber-700">El proyecto no tiene developers con asignación activa. Agrégalos en el proyecto, pestaña Equipo.</p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_125px_150px_90px_auto]">
                  <Select value={entry.developer} onChange={(e) => setEntry({ ...entry, developer: e.target.value })} disabled={!teamOptions.length}>
                    <option value="">{teamOptions.length ? 'Developer…' : 'Sin equipo disponible'}</option>
                    {(team || [])
                      .filter((a: any) => a.developer)
                      .map((a: any) => (
                        <option key={a.developer.documentId} value={a.developer.documentId}>
                          {devName(a.developer)}
                        </option>
                      ))}
                  </Select>
                  <Select value={entry.kind} onChange={(e) => setEntry({ ...entry, kind: e.target.value })} title="Tipo de horas">
                    <option value="trabajo">Trabajo</option>
                    <option value="reunion">Reunión</option>
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
      <ConfirmDialog
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={() => deleteEntry && deleteEntriesMutation.mutate(deleteEntry.ids)}
        loading={deleteEntriesMutation.isPending}
        title="Eliminar horas"
        message={`¿Eliminar ${deleteEntry?.label || 'estas horas'}? Dejarán de contar para la facturación.`}
      />
    </>
  )
}
