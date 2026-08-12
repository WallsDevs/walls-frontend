import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Code, KeyRound } from 'lucide-react'
import { rest } from '../../lib/api'
import { AVAILABILITY_LABELS, LEVEL_LABELS, PAYMENT_TYPE_LABELS } from '../../lib/labels'
import {
  Avatar,
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
  type BadgeTone,
} from '../../components/ui'
import DeveloperForm from '../../components/DeveloperForm'

const LEVEL_TONES: Record<string, BadgeTone> = { junior: 'gray', mid: 'blue', senior: 'violet' }
const AVAIL_TONES: Record<string, BadgeTone> = { full_time: 'green', part_time: 'amber', unavailable: 'red' }

export default function Developers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: devs, isLoading } = useQuery({
    queryKey: ['developers'],
    queryFn: () =>
      rest.list('developers', {
        populate: { paymentMethods: true, user: true, assignments: { populate: { project: true } } },
        sort: 'firstName:asc',
        pagination: { pageSize: 100 },
      }),
  })

  const filtered = useMemo(() => {
    if (!devs) return []
    const q = search.toLowerCase()
    return devs.filter((d: any) => {
      const matches =
        !q ||
        `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (Array.isArray(d.technologies) ? d.technologies.join(' ').toLowerCase() : '').includes(q)
      return matches && (!level || d.level === level)
    })
  }, [devs, search, level])

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Developers"
        subtitle={`${devs?.length || 0} en total`}
        actions={
          <Button icon={Plus} onClick={() => setShowForm(true)}>
            Nuevo developer
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, correo o tecnología…" />
        </div>
        <Select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full sm:w-40">
          <option value="">Todos los niveles</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay developers"
          description="Crea el primer developer para empezar a asignarlo a proyectos."
          action={
            <Button icon={Plus} onClick={() => setShowForm(true)}>
              Nuevo developer
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Developer</Th>
              <Th>Nivel</Th>
              <Th>Disponibilidad</Th>
              <Th>Tecnologías</Th>
              <Th>Proyectos</Th>
              <Th>Pago</Th>
              <Th>Acceso</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d: any) => {
              const name = `${d.firstName} ${d.lastName}`
              const activeAssignments = (d.assignments || []).filter((a: any) => a.active)
              const preferred = (d.paymentMethods || []).find((m: any) => m.preferred) || d.paymentMethods?.[0]
              return (
                <tr
                  key={d.documentId}
                  onClick={() => navigate(`/developers/${d.documentId}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="leading-tight">
                        <p className={`font-medium ${d.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {name}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-slate-400">
                          {d.email}
                          {d.github ? (
                            <span className="inline-flex items-center gap-0.5">
                              · <Code size={11} /> {d.github}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={LEVEL_TONES[d.level] || 'gray'}>{LEVEL_LABELS[d.level] || d.level}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={AVAIL_TONES[d.availability] || 'gray'}>
                      {AVAILABILITY_LABELS[d.availability] || d.availability}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex max-w-52 flex-wrap gap-1">
                      {(d.technologies || []).slice(0, 3).map((t: string) => (
                        <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {t}
                        </span>
                      ))}
                      {(d.technologies || []).length > 3 ? (
                        <span className="text-xs text-slate-400">+{d.technologies.length - 3}</span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-slate-600">
                      {activeAssignments.length > 0
                        ? activeAssignments.map((a: any) => a.project?.name).filter(Boolean).join(', ')
                        : '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500">
                      {preferred ? PAYMENT_TYPE_LABELS[preferred.type] || preferred.type : '—'}
                    </span>
                  </Td>
                  <Td>
                    {d.user ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <KeyRound size={12} /> Sí
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      )}

      <DeveloperForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
