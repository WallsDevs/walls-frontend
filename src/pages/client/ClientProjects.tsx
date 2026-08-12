import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, FolderKanban, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { hours } from '../../lib/format'
import { PROJECT_STATUS_LABELS } from '../../lib/labels'
import { Badge, Card, EmptyState, ErrorNote, PageHeader, PageLoader, type BadgeTone } from '../../components/ui'

const STATUS_TONES: Record<string, BadgeTone> = {
  planning: 'violet',
  active: 'green',
  paused: 'amber',
  completed: 'blue',
  archived: 'gray',
}

export default function ClientProjects() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['client-projects'],
    queryFn: () => api('/me/projects'),
  })

  if (isLoading) return <PageLoader />
  if (error) return <ErrorNote error={error} />

  return (
    <div>
      <PageHeader title="Mis proyectos" subtitle="Estado y horas de trabajo de tus proyectos con Walls" />

      {!(projects || []).length ? (
        <EmptyState icon={FolderKanban} title="Aún no tienes proyectos" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(projects || []).map((p: any) => {
            const progress = p.taskCounts?.total ? Math.round((p.taskCounts.done / p.taskCounts.total) * 100) : 0
            return (
              <Link key={p.documentId} to={`/client-projects/${p.documentId}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-block size-3 rounded-full" style={{ background: p.color || '#94a3b8' }} />
                      <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    </div>
                    <Badge tone={STATUS_TONES[p.status] || 'gray'}>{PROJECT_STATUS_LABELS[p.status] || p.status}</Badge>
                  </div>
                  {p.description ? <p className="mb-4 line-clamp-2 text-sm text-slate-500">{p.description}</p> : null}

                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {p.taskCounts?.done || 0}/{p.taskCounts?.total || 0} tareas completadas
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={13} /> {hours(p.totalHours)} trabajadas
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} /> {(p.team || []).map((t: any) => t.name.split(' ')[0]).join(', ') || 'Sin equipo'}
                    </span>
                  </div>

                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                    Ver reporte de horas <ArrowRight size={14} />
                  </p>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
