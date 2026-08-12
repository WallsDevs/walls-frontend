import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Code, KeyRound, Pencil, Trash2, IdCard, Mail, Clock3 } from 'lucide-react'
import { rest } from '../../lib/api'
import { fmtDate, hours, money } from '../../lib/format'
import {
  AVAILABILITY_LABELS,
  BILLING_TYPE_LABELS,
  LEVEL_LABELS,
  PAYMENT_TYPE_LABELS,
} from '../../lib/labels'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  PageLoader,
  ErrorNote,
} from '../../components/ui'
import DeveloperForm from '../../components/DeveloperForm'
import AccountModal from '../../components/AccountModal'

export default function DeveloperDetail() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [creatingAccess, setCreatingAccess] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: dev, isLoading, error } = useQuery({
    queryKey: ['developer', documentId],
    queryFn: () =>
      rest.one('developers', documentId, {
        populate: {
          paymentMethods: true,
          user: true,
          assignments: { populate: { project: true } },
        },
      }),
  })

  const { data: entries } = useQuery({
    queryKey: ['developer-entries', documentId],
    queryFn: () =>
      rest.list('time-entries', {
        filters: { developer: { documentId: { $eq: documentId } } },
        populate: { task: true, project: true },
        sort: 'date:desc',
        pagination: { pageSize: 8 },
      }),
  })

  const removeMutation = useMutation({
    mutationFn: () => rest.remove('developers', documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['developers'] })
      navigate('/developers')
    },
  })

  if (isLoading) return <PageLoader />
  if (error || !dev) return <ErrorNote error={error || new Error('Developer no encontrado')} />

  const name = `${dev.firstName} ${dev.lastName}`

  return (
    <div>
      <Link to="/developers" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Developers
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={name} className="size-12 text-base" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={dev.level === 'senior' ? 'violet' : dev.level === 'mid' ? 'blue' : 'gray'}>
                {LEVEL_LABELS[dev.level]}
              </Badge>
              <Badge tone={dev.availability === 'full_time' ? 'green' : dev.availability === 'part_time' ? 'amber' : 'red'}>
                {AVAILABILITY_LABELS[dev.availability]}
              </Badge>
              {!dev.active && <Badge tone="red">Inactivo</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!dev.user && (
            <Button variant="secondary" icon={KeyRound} onClick={() => setCreatingAccess(true)}>
              Crear acceso
            </Button>
          )}
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Información</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Mail size={14} className="text-slate-400" /> {dev.email}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <IdCard size={14} className="text-slate-400" /> {dev.cedula || 'Sin cédula'}
            </div>
            {dev.github ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Code size={14} className="text-slate-400" />
                <a
                  href={`https://github.com/${dev.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {dev.github}
                </a>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-slate-600">
              <Clock3 size={14} className="text-slate-400" /> {dev.hoursPerWeek || '—'} h/semana
            </div>
          </dl>

          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Tecnologías</h3>
          <div className="flex flex-wrap gap-1.5">
            {(dev.technologies || []).map((t: string) => (
              <span key={t} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {t}
              </span>
            ))}
            {!(dev.technologies || []).length && <span className="text-sm text-slate-400">—</span>}
          </div>

          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Métodos de pago</h3>
          <div className="space-y-2">
            {(dev.paymentMethods || []).map((m: any, i: number) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{PAYMENT_TYPE_LABELS[m.type] || m.type}</span>
                  {m.preferred && <Badge tone="blue">Preferido</Badge>}
                </div>
                {m.accountName ? <p className="text-xs text-slate-500">{m.accountName}</p> : null}
                {m.details ? <p className="text-xs text-slate-500">{m.details}</p> : null}
              </div>
            ))}
            {!(dev.paymentMethods || []).length && <span className="text-sm text-slate-400">Sin métodos registrados</span>}
          </div>

          {dev.user ? (
            <p className="mt-5 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <KeyRound size={13} /> Tiene acceso al portal ({dev.user.email})
            </p>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Aún no tiene cuenta de acceso al portal.
            </p>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">Contratos / proyectos asignados</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {(dev.assignments || []).map((a: any) => (
                <li key={a.documentId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <Link
                      to={`/projects/${a.project?.documentId}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-600"
                    >
                      {a.project?.name || 'Proyecto'}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {a.role} · {BILLING_TYPE_LABELS[a.billingType]}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {a.billingType === 'hourly' ? (
                      <>
                        <p className="font-medium text-slate-800">
                          Dev {money(a.devHourlyRate)}/h · Cliente {money(a.clientHourlyRate)}/h
                        </p>
                        <p>Margen {money((a.clientHourlyRate || 0) - (a.devHourlyRate || 0))}/h</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-slate-800">
                          Dev {money(a.devMonthlyAmount)} · Cliente {money(a.clientMonthlyAmount)}
                        </p>
                        <p>Margen fijo {money((a.clientMonthlyAmount || 0) - (a.devMonthlyAmount || 0))}/mes</p>
                      </>
                    )}
                    {!a.active && <Badge tone="red">Inactiva</Badge>}
                  </div>
                </li>
              ))}
              {!(dev.assignments || []).length && (
                <li className="px-5 py-8 text-center text-sm text-slate-400">
                  Sin proyectos asignados. Asígnalo desde la pestaña Equipo de un proyecto.
                </li>
              )}
            </ul>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">Últimas horas registradas</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {(entries || []).map((e: any) => (
                <li key={e.documentId} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="w-20 shrink-0 text-xs text-slate-400">{fmtDate(e.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {e.task?.title || '—'}
                    <span className="text-slate-400"> · {e.project?.name}</span>
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">{hours(e.hours)}</span>
                  {e.billed ? <Badge tone="green">Facturada</Badge> : <Badge tone="gray">Sin facturar</Badge>}
                </li>
              ))}
              {!(entries || []).length && (
                <li className="px-5 py-8 text-center text-sm text-slate-400">Sin horas registradas todavía.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      <DeveloperForm open={editing} onClose={() => setEditing(false)} developer={dev} />
      <AccountModal
        open={creatingAccess}
        onClose={() => setCreatingAccess(false)}
        type="developer"
        profileId={documentId}
        defaultEmail={dev.email}
        name={name}
      />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => removeMutation.mutate()}
        loading={removeMutation.isPending}
        title="Eliminar developer"
        message={`¿Seguro que quieres eliminar a ${name}? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
