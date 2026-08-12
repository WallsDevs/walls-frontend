import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  ListTodo,
} from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, hours, money, monthStartISO } from '../../lib/format'
import { BILLING_TYPE_LABELS, PROJECT_STATUS_LABELS, PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '../../lib/labels'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,

  Input,
  PageLoader,
  Select,
  TableWrap,
  Tabs,
  Td,
  Th,
  Textarea,
  PRIORITY_TONES,

} from '../../components/ui'
import ProjectForm from '../../components/ProjectForm'
import AssignmentForm from '../../components/AssignmentForm'
import TaskModal from '../../components/TaskModal'
import { PROJECT_STATUS_TONES } from './Projects'

export default function ProjectDetail() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState('overview')
  const [editingProject, setEditingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; assignment?: any }>({ open: false })
  const [deleteAssignment, setDeleteAssignment] = useState<any | null>(null)
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: any }>({ open: false })
  const [month, setMonth] = useState(monthStartISO().slice(0, 7))
  const [devFilter, setDevFilter] = useState('')

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', documentId],
    queryFn: () =>
      rest.one('projects', documentId, {
        populate: {
          client: true,
          docLinks: true,
          assignments: { populate: { developer: true } },
        },
      }),
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks', documentId],
    queryFn: () =>
      rest.list('tasks', {
        filters: { project: { documentId: { $eq: documentId } } },
        populate: { assignee: true },
        sort: 'createdAt:desc',
        pagination: { pageSize: 200 },
      }),
  })

  const { data: entries } = useQuery({
    queryKey: ['project-entries', documentId],
    queryFn: () =>
      rest.list('time-entries', {
        filters: { project: { documentId: { $eq: documentId } } },
        populate: { developer: true, task: true },
        sort: 'date:desc',
        pagination: { pageSize: 500 },
      }),
  })

  const hoursByTask = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of entries || []) {
      if (e.task) map[e.task.documentId] = (map[e.task.documentId] || 0) + Number(e.hours || 0)
    }
    return map
  }, [entries])

  const filteredEntries = useMemo(
    () =>
      (entries || []).filter(
        (e: any) =>
          (!month || String(e.date).startsWith(month)) &&
          (!devFilter || e.developer?.documentId === devFilter),
      ),
    [entries, month, devFilter],
  )

  const deleteProjectMutation = useMutation({
    mutationFn: () => rest.remove('projects', documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => rest.remove('assignments', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project'] })
      setDeleteAssignment(null)
    },
  })

  const [docText, setDocText] = useState<string | null>(null)
  const [newLink, setNewLink] = useState({ title: '', url: '' })
  const docMutation = useMutation({
    mutationFn: (data: any) => rest.update('projects', documentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', documentId] }),
  })

  if (isLoading) return <PageLoader />
  if (error || !project) return <ErrorNote error={error || new Error('Proyecto no encontrado')} />

  const team = (project.assignments || []).filter((a: any) => a.developer)
  const totalHours = (entries || []).reduce((s: number, e: any) => s + Number(e.hours || 0), 0)
  const unbilledHours = (entries || []).filter((e: any) => !e.billed).reduce((s: number, e: any) => s + Number(e.hours || 0), 0)
  const openTasks = (tasks || []).filter((t: any) => t.status !== 'done').length

  return (
    <div>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Proyectos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="mt-1 inline-block size-3.5 rounded-full" style={{ background: project.color || '#94a3b8' }} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge tone={PROJECT_STATUS_TONES[project.status] || 'gray'}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
              {project.client ? (
                <span className="inline-flex items-center gap-1">
                  <Building2 size={13} /> {project.client.name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} /> {fmtDate(project.startDate)}
                {project.endDate ? ` → ${fmtDate(project.endDate)}` : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Pencil} onClick={() => setEditingProject(true)}>
            Editar
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setDeletingProject(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Resumen' },
          { key: 'team', label: 'Equipo', count: team.filter((a: any) => a.active).length },
          { key: 'tasks', label: 'Tareas', count: openTasks },
          { key: 'hours', label: 'Horas' },
          { key: 'docs', label: 'Documentación' },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Descripción</h2>
            <p className="text-sm leading-relaxed text-slate-600">{project.description || 'Sin descripción.'}</p>
            {project.client ? (
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</h3>
                <p className="text-sm font-medium text-slate-900">{project.client.name}</p>
                <p className="text-xs text-slate-500">
                  {project.client.contactName} · {project.client.email}
                </p>
              </div>
            ) : null}
          </Card>
          <div className="grid grid-cols-2 gap-3 self-start">
            <Card className="p-4">
              <Clock3 size={16} className="mb-1.5 text-brand-500" />
              <p className="text-lg font-semibold text-slate-900">{hours(totalHours)}</p>
              <p className="text-xs text-slate-500">Horas totales</p>
            </Card>
            <Card className="p-4">
              <Clock3 size={16} className="mb-1.5 text-amber-500" />
              <p className="text-lg font-semibold text-slate-900">{hours(unbilledHours)}</p>
              <p className="text-xs text-slate-500">Sin facturar</p>
            </Card>
            <Card className="p-4">
              <ListTodo size={16} className="mb-1.5 text-brand-500" />
              <p className="text-lg font-semibold text-slate-900">{openTasks}</p>
              <p className="text-xs text-slate-500">Tareas abiertas</p>
            </Card>
            <Card className="p-4">
              <UserPlus size={16} className="mb-1.5 text-brand-500" />
              <p className="text-lg font-semibold text-slate-900">{team.filter((a: any) => a.active).length}</p>
              <p className="text-xs text-slate-500">En el equipo</p>
            </Card>
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button icon={UserPlus} onClick={() => setAssignmentModal({ open: true })}>
              Asignar developer
            </Button>
          </div>
          {!team.length ? (
            <EmptyState
              icon={UserPlus}
              title="Sin equipo asignado"
              description="Asigna developers con su rol y esquema de pago para este proyecto."
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Developer</Th>
                  <Th>Rol</Th>
                  <Th>Esquema</Th>
                  <Th right>Pago al dev</Th>
                  <Th right>Cobro al cliente</Th>
                  <Th right>Margen</Th>
                  <Th>Estado</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {team.map((a: any) => {
                  const hourly = a.billingType === 'hourly'
                  const dev = hourly ? a.devHourlyRate : a.devMonthlyAmount
                  const cli = hourly ? a.clientHourlyRate : a.clientMonthlyAmount
                  return (
                    <tr key={a.documentId} className="hover:bg-slate-50">
                      <Td>
                        <Link to={`/developers/${a.developer.documentId}`} className="font-medium text-slate-900 hover:text-brand-600">
                          {a.developer.firstName} {a.developer.lastName}
                        </Link>
                      </Td>
                      <Td>{a.role}</Td>
                      <Td>
                        <Badge tone={hourly ? 'blue' : 'violet'}>{BILLING_TYPE_LABELS[a.billingType]}</Badge>
                      </Td>
                      <Td right>
                        <span className="font-medium">{money(dev)}</span>
                        <span className="text-xs text-slate-400">{hourly ? '/h' : '/mes'}</span>
                      </Td>
                      <Td right>
                        <span className="font-medium">{money(cli)}</span>
                        <span className="text-xs text-slate-400">{hourly ? '/h' : '/mes'}</span>
                      </Td>
                      <Td right>
                        <span className="font-medium text-emerald-600">{money((cli || 0) - (dev || 0))}</span>
                        <span className="text-xs text-slate-400">{hourly ? '/h' : '/mes'}</span>
                      </Td>
                      <Td>{a.active ? <Badge tone="green">Activa</Badge> : <Badge tone="gray">Inactiva</Badge>}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setAssignmentModal({ open: true, assignment: a })}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteAssignment(a)}
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
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button icon={Plus} onClick={() => setTaskModal({ open: true })}>
              Nueva tarea
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TASK_STATUS_ORDER.map((status) => {
              const list = (tasks || []).filter((t: any) => t.status === status)
              return (
                <div key={status} className="rounded-xl bg-slate-200/50 p-2.5">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {TASK_STATUS_LABELS[status]}
                    </span>
                    <span className="rounded-full bg-white px-1.5 text-xs text-slate-500">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((t: any) => (
                      <button
                        key={t.documentId}
                        onClick={() => setTaskModal({ open: true, task: t })}
                        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                      >
                        <p className="mb-1.5 text-sm font-medium leading-snug text-slate-900">{t.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={PRIORITY_TONES[t.priority] || 'gray'}>{PRIORITY_LABELS[t.priority]}</Badge>
                          <span className="text-xs text-slate-400">
                            {hours(hoursByTask[t.documentId] || 0)}
                            {t.estimateHours ? ` / ${hours(t.estimateHours)}` : ''}
                          </span>
                          {t.assignee ? (
                            <span
                              title={`${t.assignee.firstName} ${t.assignee.lastName}`}
                              className="ml-auto flex size-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700"
                            >
                              {t.assignee.firstName[0]}
                              {t.assignee.lastName[0]}
                            </span>
                          ) : null}
                        </div>
                        {t.dueDate ? <p className="mt-1.5 text-xs text-slate-400">Vence {fmtDate(t.dueDate)}</p> : null}
                      </button>
                    ))}
                    {!list.length && <p className="px-1 py-3 text-center text-xs text-slate-400">Vacío</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'hours' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
            <Select value={devFilter} onChange={(e) => setDevFilter(e.target.value)} className="w-56">
              <option value="">Todo el equipo</option>
              {team.map((a: any) => (
                <option key={a.developer.documentId} value={a.developer.documentId}>
                  {a.developer.firstName} {a.developer.lastName}
                </option>
              ))}
            </Select>
            <button onClick={() => setMonth('')} className="text-xs text-brand-600 hover:underline">
              Ver todo el histórico
            </button>
            <span className="ml-auto text-sm text-slate-500">
              Total: <span className="font-semibold text-slate-900">{hours(filteredEntries.reduce((s: number, e: any) => s + Number(e.hours || 0), 0))}</span>
            </span>
          </div>
          <TableWrap>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Developer</Th>
                <Th>Tarea</Th>
                <Th>Descripción</Th>
                <Th right>Horas</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e: any) => (
                <tr key={e.documentId} className="hover:bg-slate-50">
                  <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
                  <Td>{e.developer ? `${e.developer.firstName} ${e.developer.lastName}` : '—'}</Td>
                  <Td>{e.task?.title || '—'}</Td>
                  <Td className="max-w-64 truncate text-slate-500">{e.description || '—'}</Td>
                  <Td right className="font-medium">{hours(e.hours)}</Td>
                  <Td>{e.billed ? <Badge tone="green">Facturada</Badge> : <Badge tone="gray">Sin facturar</Badge>}</Td>
                </tr>
              ))}
              {!filteredEntries.length && (
                <tr>
                  <Td className="py-8 text-center text-slate-400" colSpan={6}>
                    Sin horas en este período.
                  </Td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        </div>
      )}

      {tab === 'docs' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Documentación (Markdown)</h2>
              <Button
                size="sm"
                onClick={() => docMutation.mutate({ documentation: docText ?? project.documentation })}
                loading={docMutation.isPending}
                disabled={docText === null || docText === project.documentation}
              >
                Guardar
              </Button>
            </div>
            <Textarea
              value={docText ?? project.documentation ?? ''}
              onChange={(e) => setDocText(e.target.value)}
              className="min-h-72 font-mono text-xs"
              placeholder="# Título&#10;&#10;Notas, acuerdos, accesos…"
            />

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Enlaces</h3>
            <ul className="mb-3 space-y-1.5">
              {(project.docLinks || []).map((l: any, i: number) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <ExternalLink size={14} className="shrink-0 text-slate-400" />
                  <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-brand-600 hover:underline">
                    {l.title}
                  </a>
                  <button
                    onClick={() =>
                      docMutation.mutate({
                        docLinks: (project.docLinks || [])
                          .filter((_: any, idx: number) => idx !== i)
                          .map((x: any) => ({ title: x.title, url: x.url, note: x.note })),
                      })
                    }
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input placeholder="Título" value={newLink.title} onChange={(e) => setNewLink({ ...newLink, title: e.target.value })} />
              <Input placeholder="https://…" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} />
              <Button
                variant="secondary"
                onClick={() => {
                  docMutation.mutate({
                    docLinks: [
                      ...(project.docLinks || []).map((x: any) => ({ title: x.title, url: x.url, note: x.note })),
                      newLink,
                    ],
                  })
                  setNewLink({ title: '', url: '' })
                }}
                disabled={!newLink.title || !newLink.url}
              >
                Agregar
              </Button>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Vista previa</h2>
            <div className="markdown text-sm text-slate-700">
              <ReactMarkdown>{docText ?? project.documentation ?? '*Sin documentación todavía.*'}</ReactMarkdown>
            </div>
          </Card>
        </div>
      )}

      <ProjectForm open={editingProject} onClose={() => setEditingProject(false)} project={project} />
      <AssignmentForm
        open={assignmentModal.open}
        onClose={() => setAssignmentModal({ open: false })}
        projectId={documentId}
        assignment={assignmentModal.assignment}
      />
      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false })}
        projectId={documentId}
        task={taskModal.task}
      />
      <ConfirmDialog
        open={deletingProject}
        onClose={() => setDeletingProject(false)}
        onConfirm={() => deleteProjectMutation.mutate()}
        loading={deleteProjectMutation.isPending}
        title="Eliminar proyecto"
        message={`¿Eliminar "${project.name}" con sus tareas y asignaciones? Esta acción no se puede deshacer.`}
      />
      <ConfirmDialog
        open={!!deleteAssignment}
        onClose={() => setDeleteAssignment(null)}
        onConfirm={() => deleteAssignmentMutation.mutate(deleteAssignment.documentId)}
        loading={deleteAssignmentMutation.isPending}
        title="Quitar del equipo"
        message={`¿Quitar a ${deleteAssignment?.developer?.firstName} de este proyecto? Si ya registró horas, considera desactivar la asignación en lugar de eliminarla.`}
      />
    </div>
  )
}
