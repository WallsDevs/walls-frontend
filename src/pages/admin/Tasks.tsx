import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List, ListTodo, Plus } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_STATUS_ORDER, taskAssignees } from '../../lib/labels'
import {
  AvatarStack,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  PageLoader,
  SearchInput,
  Select,
  TableWrap,
  Td,
  Th,
  cx,
  PRIORITY_TONES,
} from '../../components/ui'
import TaskModal from '../../components/TaskModal'

type ViewMode = 'list' | 'board'

export default function Tasks() {
  const qc = useQueryClient()
  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [modal, setModal] = useState<{ open: boolean; task?: any }>({ open: false })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () =>
      rest.list('tasks', {
        populate: { project: true, assignee: true, assignees: true, attachments: true },
        sort: 'createdAt:desc',
        pagination: { pageSize: 300 },
      }),
  })

  const { data: projects } = useQuery({
    queryKey: ['projects-min'],
    queryFn: () => rest.list('projects', { sort: 'name:asc', pagination: { pageSize: 100 } }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => rest.update('tasks', id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const bySearchProject = useMemo(() => {
    const q = search.toLowerCase()
    return (tasks || []).filter((t: any) => {
      if (q && !t.title.toLowerCase().includes(q)) return false
      if (projectFilter && t.project?.documentId !== projectFilter) return false
      return true
    })
  }, [tasks, search, projectFilter])

  const filtered = useMemo(
    () =>
      bySearchProject.filter((t: any) => {
        if (statusFilter === 'open' && t.status === 'done') return false
        if (statusFilter && statusFilter !== 'open' && t.status !== statusFilter) return false
        return true
      }),
    [bySearchProject, statusFilter],
  )

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Tareas"
        subtitle="Todas las tareas de todos los proyectos"
        actions={
          <Button icon={Plus} onClick={() => setModal({ open: true })}>
            Nueva tarea
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar tarea…" />
        </div>
        <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full sm:w-52">
          <option value="">Todos los proyectos</option>
          {(projects || []).map((p: any) => (
            <option key={p.documentId} value={p.documentId}>
              {p.name}
            </option>
          ))}
        </Select>
        {view === 'list' ? (
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-44">
            <option value="open">Abiertas</option>
            <option value="">Todas</option>
            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="ml-0 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:ml-auto">
          <button
            onClick={() => setView('list')}
            title="Vista de lista"
            className={cx(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              view === 'list' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            <List size={14} /> Lista
          </button>
          <button
            onClick={() => setView('board')}
            title="Vista de tablero"
            className={cx(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              view === 'board' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            <LayoutGrid size={14} /> Tablero
          </button>
        </div>
      </div>

      {view === 'list' ? (
        !filtered.length ? (
          <EmptyState icon={ListTodo} title="No hay tareas con estos filtros" />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Tarea</Th>
                <Th>Proyecto</Th>
                <Th>Asignados</Th>
                <Th>Prioridad</Th>
                <Th>Vence</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr key={t.documentId} className="hover:bg-slate-50">
                  <Td>
                    <button
                      onClick={() => setModal({ open: true, task: t })}
                      className="text-left font-medium text-slate-900 hover:text-brand-600"
                    >
                      {t.title}
                    </button>
                  </Td>
                  <Td>
                    <span className="text-slate-600">{t.project?.name || '—'}</span>
                  </Td>
                  <Td>
                    {taskAssignees(t).length ? (
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <AvatarStack people={taskAssignees(t)} />
                        <span className="truncate">{taskAssignees(t).length === 1 ? taskAssignees(t)[0].name : `${taskAssignees(t).length} personas`}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Sin asignar</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={PRIORITY_TONES[t.priority] || 'gray'}>{PRIORITY_LABELS[t.priority]}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">
                    {t.status === 'done' && t.completedAt ? (
                      <span className="text-emerald-600">Completada {fmtDate(t.completedAt)}</span>
                    ) : (
                      fmtDate(t.dueDate)
                    )}
                  </Td>
                  <Td>
                    <Select
                      value={t.status}
                      onChange={(e) => statusMutation.mutate({ id: t.documentId, status: e.target.value })}
                      className="w-36 py-1 text-xs"
                    >
                      {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      ) : !bySearchProject.length ? (
        <EmptyState icon={ListTodo} title="No hay tareas con estos filtros" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUS_ORDER.map((status) => {
            const list = bySearchProject.filter((t: any) => t.status === status)
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
                      onClick={() => setModal({ open: true, task: t })}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                    >
                      <p className="mb-1.5 text-sm font-medium leading-snug text-slate-900">{t.title}</p>
                      {t.project ? (
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: t.project.color || '#94a3b8' }} />
                          <span className="truncate text-xs text-slate-500">{t.project.name}</span>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={PRIORITY_TONES[t.priority] || 'gray'}>{PRIORITY_LABELS[t.priority]}</Badge>
                        {t.kind === 'reunion' ? <Badge tone="violet">Reunión</Badge> : null}
                        <AvatarStack people={taskAssignees(t)} className="ml-auto" />
                      </div>
                      {t.status === 'done' && t.completedAt ? (
                        <p className="mt-1.5 text-xs text-emerald-600">Completada {fmtDate(t.completedAt)}</p>
                      ) : t.dueDate ? (
                        <p className="mt-1.5 text-xs text-slate-400">Vence {fmtDate(t.dueDate)}</p>
                      ) : null}
                    </button>
                  ))}
                  {!list.length && <p className="px-1 py-3 text-center text-xs text-slate-400">Vacío</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TaskModal open={modal.open} onClose={() => setModal({ open: false })} task={modal.task} />
    </div>
  )
}
