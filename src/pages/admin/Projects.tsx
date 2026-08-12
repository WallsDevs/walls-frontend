import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FolderKanban, Plus, Users } from 'lucide-react'
import { rest } from '../../lib/api'
import { PROJECT_STATUS_LABELS } from '../../lib/labels'
import { Badge, Button, Card, EmptyState, PageHeader, PageLoader, type BadgeTone } from '../../components/ui'
import ProjectForm from '../../components/ProjectForm'

export const PROJECT_STATUS_TONES: Record<string, BadgeTone> = {
  planning: 'violet',
  active: 'green',
  paused: 'amber',
  completed: 'blue',
  archived: 'gray',
}

export default function Projects() {
  const [showForm, setShowForm] = useState(false)

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      rest.list('projects', {
        populate: {
          client: true,
          assignments: { populate: { developer: true } },
          tasks: { fields: ['status'] },
        },
        sort: 'name:asc',
        pagination: { pageSize: 100 },
      }),
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Proyectos"
        subtitle={`${projects?.length || 0} en total`}
        actions={
          <Button icon={Plus} onClick={() => setShowForm(true)}>
            Nuevo proyecto
          </Button>
        }
      />

      {!projects?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="No hay proyectos"
          description="Crea un proyecto y asígnale developers y cliente."
          action={
            <Button icon={Plus} onClick={() => setShowForm(true)}>
              Nuevo proyecto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p: any) => {
            const team = (p.assignments || []).filter((a: any) => a.active && a.developer)
            const tasks = p.tasks || []
            const done = tasks.filter((t: any) => t.status === 'done').length
            const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0
            return (
              <Link key={p.documentId} to={`/projects/${p.documentId}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="mt-0.5 inline-block size-3 shrink-0 rounded-full"
                        style={{ background: p.color || '#94a3b8' }}
                      />
                      <div>
                        <h3 className="font-semibold text-slate-900">{p.name}</h3>
                        <p className="text-xs text-slate-500">{p.client?.name || 'Sin cliente'}</p>
                      </div>
                    </div>
                    <Badge tone={PROJECT_STATUS_TONES[p.status] || 'gray'}>
                      {PROJECT_STATUS_LABELS[p.status] || p.status}
                    </Badge>
                  </div>

                  {p.description ? (
                    <p className="mb-4 line-clamp-2 text-sm text-slate-500">{p.description}</p>
                  ) : null}

                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {done}/{tasks.length} tareas
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {team.slice(0, 4).map((a: any) => (
                        <span
                          key={a.documentId}
                          title={`${a.developer.firstName} ${a.developer.lastName} · ${a.role}`}
                          className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-brand-100 text-[10px] font-semibold text-brand-700"
                        >
                          {a.developer.firstName[0]}
                          {a.developer.lastName[0]}
                        </span>
                      ))}
                      {team.length > 4 && (
                        <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500">
                          +{team.length - 4}
                        </span>
                      )}
                      {!team.length && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Users size={13} /> Sin equipo
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <ProjectForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
