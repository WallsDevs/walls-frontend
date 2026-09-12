import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, MailOpen, MoreHorizontal, PhoneCall, Plus, Repeat, Send, StickyNote, Trash2, UserCheck } from 'lucide-react'
import { api, rest } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { CLOSE_REASON_LABELS, LEAD_ACTIVITY_KIND_LABELS, PRIORITY_LABELS } from '../../lib/labels'
import { useStageChange } from '../../components/StageChangeDialog'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageLoader,
  Select,
  Textarea,
  inputCls,
  cx,
} from '../../components/ui'

const ACTIVITY_ICONS: Record<string, any> = {
  mensaje_enviado: Send,
  seguimiento: Repeat,
  respuesta_recibida: MailOpen,
  llamada: PhoneCall,
  propuesta_enviada: FileText,
  nota: StickyNote,
}

const emptyActivity = () => ({ kind: 'nota', description: '', date: new Date().toISOString().slice(0, 10) })

function ActivityModal({ open, onClose, leadId }: { open: boolean; onClose: () => void; leadId: string }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyActivity())

  useEffect(() => {
    if (open) setForm(emptyActivity())
  }, [open])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () =>
      rest.create('lead-activities', { kind: form.kind, date: form.date, description: form.description || null, lead: leadId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', leadId] })
      qc.invalidateQueries({ queryKey: ['lead-activities'] })
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
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.kind || !form.date}>
            Agregar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo *">
            <Select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              {Object.entries(LEAD_ACTIVITY_KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha *">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
        <Field label="Nota" hint="Opcional">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Qué pasó en este contacto…" />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

/** Input sin chrome hasta que se pasa el mouse o se enfoca — para editar en línea sin que parezca un formulario. */
function InlineInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        'w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100',
        className,
      )}
    />
  )
}

function InlineTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        'min-h-16 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100',
        className,
      )}
    />
  )
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 px-2 text-xs text-slate-500">{label}</p>
      {children}
      {hint ? <p className="px-2 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  )
}

const inlineSelectCls = cx(inputCls, 'border-transparent bg-transparent hover:border-slate-200')

export default function LeadDetail() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activityModal, setActivityModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<any>({})

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

  useEffect(() => {
    if (!lead) return
    setForm({
      companyName: lead.companyName || '',
      contactName: lead.contactName || '',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      website: lead.website || '',
      linkedinUrl: lead.linkedinUrl || '',
      country: lead.country || '',
      ownerName: lead.ownerName || '',
      notes: lead.notes || '',
      qualificationScore: lead.qualificationScore ?? '',
    })
    // Solo al cambiar de lead: no queremos pisar lo que el usuario está escribiendo cuando refresca la query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.documentId])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const fieldMutation = useMutation({
    mutationFn: (data: any) => rest.update('leads', documentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead', documentId] }),
  })

  const saveField = (key: string) => {
    if (!lead) return
    const current = lead[key] || ''
    if (form[key] === current) return
    if (key === 'companyName' && !form[key]) {
      set('companyName', lead.companyName)
      return
    }
    fieldMutation.mutate({ [key]: form[key] || null })
  }

  // Aparte de saveField porque 0 es un puntaje válido y `|| null` lo borraría.
  const saveScore = () => {
    if (!lead) return
    const raw = form.qualificationScore
    const next = raw === '' || raw === null || raw === undefined ? null : Number(raw)
    if (next === (lead.qualificationScore ?? null)) return
    fieldMutation.mutate({ qualificationScore: next })
  }

  const stageChange = useStageChange()

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

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <input
          value={form.companyName ?? ''}
          onChange={(e) => set('companyName', e.target.value)}
          onBlur={() => saveField('companyName')}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 -mx-2 text-xl font-semibold tracking-tight text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={lead.urgency || ''}
            onChange={(e) => fieldMutation.mutate({ urgency: e.target.value })}
            className="w-32"
          >
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select
            value={lead.stage?.documentId || ''}
            onChange={(e) => stageChange.request(lead, (stages || []).find((s: any) => s.documentId === e.target.value))}
            className="w-48"
            title={lead.stage?.description || undefined}
          >
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
          <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      {stageChange.error && !stageChange.dialogOpen ? (
        <div className="mb-4">
          <ErrorNote error={new Error(stageChange.error)} />
        </div>
      ) : null}
      {fieldMutation.error ? (
        <div className="mb-4">
          <ErrorNote error={fieldMutation.error} />
        </div>
      ) : null}
      {convertMutation.error ? (
        <div className="mb-4">
          <ErrorNote error={convertMutation.error} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="p-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Datos del lead</p>
          <div className="space-y-2.5">
            <FieldRow label="Persona de contacto">
              <InlineInput value={form.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} onBlur={() => saveField('contactName')} />
            </FieldRow>
            <FieldRow label="Correo">
              <InlineInput
                type="email"
                value={form.contactEmail ?? ''}
                onChange={(e) => set('contactEmail', e.target.value)}
                onBlur={() => saveField('contactEmail')}
              />
            </FieldRow>
            <FieldRow label="Teléfono">
              <InlineInput value={form.contactPhone ?? ''} onChange={(e) => set('contactPhone', e.target.value)} onBlur={() => saveField('contactPhone')} />
            </FieldRow>
            <FieldRow label="Sitio web">
              <InlineInput value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} onBlur={() => saveField('website')} placeholder="https://…" />
            </FieldRow>
            <FieldRow label="LinkedIn">
              <InlineInput
                value={form.linkedinUrl ?? ''}
                onChange={(e) => set('linkedinUrl', e.target.value)}
                onBlur={() => saveField('linkedinUrl')}
                placeholder="https://linkedin.com/in/…"
              />
            </FieldRow>
            <FieldRow label="País">
              <InlineInput value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} onBlur={() => saveField('country')} />
            </FieldRow>
            <FieldRow label="Origen">
              <select
                value={lead.source?.documentId || ''}
                onChange={(e) => fieldMutation.mutate({ source: e.target.value || null })}
                className={inlineSelectCls}
              >
                <option value="">Sin origen</option>
                {(sources || []).map((s: any) => (
                  <option key={s.documentId} value={s.documentId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Dueño del lead">
              <InlineInput value={form.ownerName ?? ''} onChange={(e) => set('ownerName', e.target.value)} onBlur={() => saveField('ownerName')} placeholder="Quién lo está trabajando" />
            </FieldRow>
            <FieldRow label="Puntaje de calificación (0–12)" hint="Menos de 7: no se hace propuesta">
              <InlineInput
                type="number"
                min={0}
                max={12}
                step={1}
                value={form.qualificationScore ?? ''}
                onChange={(e) => set('qualificationScore', e.target.value)}
                onBlur={saveScore}
                placeholder="Sin puntaje"
              />
            </FieldRow>
            <FieldRow label="Próximo paso">
              <InlineInput
                type="date"
                defaultValue={lead.nextFollowUpDate || ''}
                key={lead.nextFollowUpDate}
                onChange={(e) => fieldMutation.mutate({ nextFollowUpDate: e.target.value || null })}
              />
            </FieldRow>
            <FieldRow label="Motivo de cierre">
              <select
                value={lead.closeReason || ''}
                onChange={(e) => fieldMutation.mutate({ closeReason: e.target.value || null })}
                className={inlineSelectCls}
              >
                <option value="">—</option>
                {Object.entries(CLOSE_REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Última actividad">
              <p className="px-2 py-1 text-sm text-slate-500">{lead.lastActivityAt ? fmtDate(lead.lastActivityAt) : '—'}</p>
            </FieldRow>
            <div className="border-t border-slate-100 pt-2.5">
              <FieldRow label="Notas">
                <InlineTextarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} onBlur={() => saveField('notes')} placeholder="Sin notas" />
              </FieldRow>
            </div>
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
                        <Badge tone="blue">{LEAD_ACTIVITY_KIND_LABELS[a.kind] ?? a.kind}</Badge>
                        <span className="text-xs text-slate-400">
                          {fmtDate(a.date)}
                          {a.loggedByName ? ` · ${a.loggedByName}` : ''}
                        </span>
                      </div>
                      {a.description ? <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{a.description}</p> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {stageChange.dialog}
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
