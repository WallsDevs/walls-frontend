import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, ListTodo, Plus, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, hours, todayISO } from '../../lib/format'
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../lib/labels'
import MeetingLogForm from '../../components/MeetingLogForm'
import {
  AvatarStack,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  Select,
  Textarea,
  PRIORITY_TONES,

} from '../../components/ui'
import NewTaskModal from '../../components/dev/NewTaskModal'

function LogHoursModal({ task, onClose }: { task: any | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(todayISO())
  const [hrs, setHrs] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api('/me/time-entries', {
        method: 'POST',
        body: { task: task.documentId, date, hours: Number(hrs), description: description || undefined },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-tasks'] })
      qc.invalidateQueries({ queryKey: ['me-entries'] })
      onClose()
    },
  })

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      title={`Registrar horas · ${task?.title || ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!hrs || Number(hrs) <= 0}>
            Registrar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horas">
            <Input type="number" min={0.5} max={24} step={0.5} value={hrs} onChange={(e) => setHrs(e.target.value)} placeholder="4" autoFocus />
          </Field>
        </div>
        <Field label="¿Qué hiciste?">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Implementé el flujo de…" />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

/** Registrar una reunión desde el portal: el participante la registra una vez para todos. */
function MeetingModal({ task, onClose }: { task: any | null; onClose: () => void }) {
  return (
    <Modal open={!!task} onClose={onClose} title={`Registrar reunión · ${task?.title || ''}`} size="lg">
      {task ? (
        <MeetingLogForm
          endpoint={`/me/tasks/${task.documentId}/meeting`}
          participants={task.assignees || []}
          invalidateKeys={[['me-tasks'], ['me-entries']]}
          onSaved={onClose}
          compact
        />
      ) : null}
    </Modal>
  )
}

export default function MyTasks() {
  const qc = useQueryClient()
  const [logging, setLogging] = useState<any | null>(null)
  const [meeting, setMeeting] = useState<any | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [creating, setCreating] = useState(false)

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['me-tasks'],
    queryFn: () => api('/me/tasks'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/me/tasks/${id}`, { method: 'PUT', body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-tasks'] }),
  })

  const byProject = useMemo(() => {
    const groups: Record<string, { name: string; color?: string; tasks: any[] }> = {}
    for (const t of tasks || []) {
      if (!showDone && t.status === 'done') continue
      const key = t.project?.documentId || 'none'
      if (!groups[key]) groups[key] = { name: t.project?.name || 'Sin proyecto', color: t.project?.color, tasks: [] }
      groups[key].tasks.push(t)
    }
    return Object.values(groups)
  }, [tasks, showDone])

  if (isLoading) return <PageLoader />
  if (error) return <ErrorNote error={error} />

  return (
    <div>
      <PageHeader
        title="Mis tareas"
        subtitle="Lo que tienes asignado, por proyecto"
        actions={
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-4 accent-brand-500" />
              Ver completadas
            </label>
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Nueva tarea
            </Button>
          </>
        }
      />

      {!byProject.length ? (
        <EmptyState
          icon={ListTodo}
          title="No tienes tareas pendientes"
          description="Cuando te asignen tareas aparecerán aquí."
        />
      ) : (
        <div className="space-y-5">
          {byProject.map((g) => (
            <Card key={g.name} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
                <span className="inline-block size-2.5 rounded-full" style={{ background: g.color || '#94a3b8' }} />
                <h2 className="text-sm font-semibold text-slate-900">{g.name}</h2>
                <span className="text-xs text-slate-400">{g.tasks.length} tareas</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {g.tasks.map((t: any) => (
                  <li key={t.documentId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {t.title}
                        {t.kind === 'reunion' ? (
                          <span className="ml-2 align-middle">
                            <Badge tone="violet">Reunión</Badge>
                          </span>
                        ) : null}
                      </p>
                      {t.description ? <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.description}</p> : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone={PRIORITY_TONES[t.priority] || 'gray'}>{PRIORITY_LABELS[t.priority]}</Badge>
                        {(t.assignees || []).length > 1 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <AvatarStack people={t.assignees} />
                            {t.assignees.length} personas
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Clock3 size={12} />
                          {hours(t.myHours)}
                          {t.estimateHours ? ` de ${hours(t.estimateHours)} estimadas` : ''}
                        </span>
                        {t.status === 'done' && t.completedAt ? (
                          <span className="text-xs text-emerald-600">Completada {fmtDate(t.completedAt)}</span>
                        ) : t.dueDate ? (
                          <span className="text-xs text-slate-400">Vence {fmtDate(t.dueDate)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Select
                        value={t.status}
                        onChange={(e) => statusMutation.mutate({ id: t.documentId, status: e.target.value })}
                        className="w-36 py-1.5 text-xs"
                      >
                        {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                      {t.kind === 'reunion' || (t.assignees || []).length > 1 ? (
                        <Button size="sm" icon={Users} onClick={() => setMeeting(t)}>
                          Registrar reunión
                        </Button>
                      ) : null}
                      <Button size="sm" variant={t.kind === 'reunion' ? 'secondary' : 'primary'} icon={Clock3} onClick={() => setLogging(t)}>
                        Registrar horas
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <LogHoursModal task={logging} onClose={() => setLogging(null)} />
      <MeetingModal task={meeting} onClose={() => setMeeting(null)} />
      <NewTaskModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
