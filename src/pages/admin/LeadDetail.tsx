import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { api, rest } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { LEAD_ACTIVITY_KIND_LABELS, PRIORITY_LABELS } from '../../lib/labels'
import {
  Badge,
  Button,
  Card,
  ColorBadge,
  ConfirmDialog,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageLoader,
  PRIORITY_TONES,
  Select,
  Textarea,
} from '../../components/ui'
import { LeadModal } from './Leads'

const ACTIVITY_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  whatsapp: MessageCircle,
  note: StickyNote,
  other: MoreHorizontal,
}

const emptyActivity = () => ({ kind: 'call', description: '', date: new Date().toISOString().slice(0, 10) })

function ActivityModal({ open, onClose, leadId }: { open: boolean; onClose: () => void; leadId: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyActivity())

  useEffect(() => {
    if (open) setForm(emptyActivity())
  }, [open])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => rest.create('lead-activities', { ...form, lead: leadId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', leadId] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar actividad"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.description}>
            Agregar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              {Object.entries(LEAD_ACTIVITY_KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
        <Field label="Descripción *">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Qué pasó en este contacto…" />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

export default function LeadDetail() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [activityModal, setActivityModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', documentId],
    queryFn: () =>
      rest.one('leads', documentId, {
        populate: { stage: true, source: true, activities: true, convertedToClient: true },
      }),
  })

  const { data: stages } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => rest.list('pipeline-stages', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })

  const { data: sources } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => rest.list('lead-sources', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })

  const stageMutation = useMutation({
    mutationFn: (stage: string) => rest.update('leads', documentId, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead', documentId] }),
  })

  const convertMutation = useMutation({
    mutationFn: () => api(`/leads/${documentId}/convert-to-client`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', documentId] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => rest.remove('leads', documentId),
    onSuccess: () => navigate('/leads'),
  })

  if (isLoading) return <PageLoader />
  if (error || !lead) return <ErrorNote error={error || new Error('Lead no encontrado')} />

  const activities = [...(lead.activities || [])].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const canConvert = lead.stage?.outcome === 'won' && !lead.convertedToClient

  return (
    <div>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Leads
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{lead.companyName}</h1>
            <Badge tone={PRIORITY_TONES[lead.urgency] || 'gray'}>{PRIORITY_LABELS[lead.urgency]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[lead.contactName, lead.contactEmail, lead.contactPhone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={lead.stage?.documentId || ''}
            onChange={(e) => stageMutation.mutate(e.target.value)}
            className="w-48"
          >
            {!lead.stage ? <option value="">Sin etapa</option> : null}
            {(stages || []).map((s: any) => (
              <option key={s.documentId} value={s.documentId}>
                {s.name}
              </option>
            ))}
          </Select>
          {lead.convertedToClient ? (
            <Badge tone="green">Convertido a cliente</Badge>
          ) : canConvert ? (
            <Button icon={UserCheck} onClick={() => convertMutation.mutate()} loading={convertMutation.isPending}>
              Convertir a cliente
            </Button>
          ) : null}
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      {convertMutation.error ? <ErrorNote error={convertMutation.error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="p-5">
          <p className="mb-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Datos del lead</p>
          <div className="space-y-3.5 text-sm">
            <div>
              <p className="mb-0.5 text-xs text-slate-500">Origen</p>
              {lead.source ? <ColorBadge color={lead.source.color}>{lead.source.name}</ColorBadge> : <p className="text-slate-400">Sin origen</p>}
            </div>
            {lead.country ? (
              <div>
                <p className="mb-0.5 text-xs text-slate-500">País</p>
                <p className="text-slate-700">{lead.country}</p>
              </div>
            ) : null}
            {lead.website ? (
              <div>
                <p className="mb-0.5 text-xs text-slate-500">Sitio web</p>
                <a href={lead.website} target="_blank" rel="noreferrer" className="break-all text-brand-600 hover:text-brand-700">
                  {lead.website}
                </a>
              </div>
            ) : null}
            {lead.linkedinUrl ? (
              <div>
                <p className="mb-0.5 text-xs text-slate-500">LinkedIn</p>
                <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="break-all text-brand-600 hover:text-brand-700">
                  {lead.linkedinUrl}
                </a>
              </div>
            ) : null}
            <div>
              <p className="mb-0.5 text-xs text-slate-500">Dueño del lead</p>
              <p className="text-slate-700">{lead.ownerName || '—'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-slate-500">Próximo seguimiento</p>
              <p className="text-slate-700">{lead.nextFollowUpDate ? fmtDate(lead.nextFollowUpDate) : 'sin programar'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-slate-500">Última actividad</p>
              <p className="text-slate-700">{lead.lastActivityAt ? fmtDate(lead.lastActivityAt) : '—'}</p>
            </div>
            {lead.notes ? (
              <div className="border-t border-slate-100 pt-3.5">
                <p className="mb-0.5 text-xs text-slate-500">Notas</p>
                <p className="whitespace-pre-line text-slate-600">{lead.notes}</p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Seguimiento</p>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setActivityModal(true)}>
              Agregar actividad
            </Button>
          </div>

          {!activities.length ? (
            <p className="py-6 text-center text-sm text-slate-400">Todavía no hay actividades registradas.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((a: any) => {
                const Icon = ACTIVITY_ICONS[a.kind] || MoreHorizontal
                return (
                  <div key={a.documentId} className="flex gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{LEAD_ACTIVITY_KIND_LABELS[a.kind]}</span>
                        <span className="text-xs text-slate-400">
                          {fmtDate(a.date)}
                          {a.loggedByName ? ` · ${a.loggedByName}` : ''}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{a.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <LeadModal open={editing} onClose={() => setEditing(false)} lead={lead} stages={stages || []} sources={sources || []} />
      <ActivityModal open={activityModal} onClose={() => setActivityModal(false)} leadId={documentId} />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Eliminar lead"
        message={`¿Eliminar ${lead.companyName} y todo su historial de seguimiento?`}
      />
    </div>
  )
}
