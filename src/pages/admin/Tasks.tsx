import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListTodo, Plus } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../lib/labels'
import {
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
  PRIORITY_TONES,

} from '../../components/ui'
import TaskModal from '../../components/TaskModal'

export default function Tasks() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [modal, setModal] = useState<{ open: boolean; task?: any }>({ open: false })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () =>
      rest.list('tasks', {
        populate: { project: true, assignee: true },
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (tasks || []).filter((t: any) => {
      if (q && !t.title.toLowerCase().includes(q)) return false
      if (projectFilter && t.project?.documentId !== projectFilter) return false
      if (statusFilter === 'open' && t.status === 'done') return false
      if (statusFilter && statusFilter !== 'open' && t.status !== statusFilter) return false
      return true
    })
  }, [tasks, search, projectFilter, statusFilter])

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

      <div className="mb-4 flex flex-wrap gap-2">
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
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-44">
          <option value="open">Abiertas</option>
          <option value="">Todas</option>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {!filtered.length ? (
        <EmptyState icon={ListTodo} title="No hay tareas con estos filtros" />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Tarea</Th>
              <Th>Proyecto</Th>
              <Th>Asignada a</Th>
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
                  {t.assignee ? (
                    <span className="text-slate-600">
                      {t.assignee.firstName} {t.assignee.lastName}
                    </span>
                  ) : (
                    <span className="text-slate-400">Sin asignar</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={PRIORITY_TONES[t.priority] || 'gray'}>{PRIORITY_LABELS[t.priority]}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-slate-500">{fmtDate(t.dueDate)}</Td>
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
      )}

      <TaskModal open={modal.open} onClose={() => setModal({ open: false })} task={modal.task} />
    </div>
  )
}
