import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ExternalLink,
  FileText,
  MailOpen,
  MoreHorizontal,
  Pencil,
  PhoneCall,
  Plus,
  Repeat,
  Send,
  StickyNote,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { api, rest } from '../lib/api'
import { fmtDate } from '../lib/format'
import { CLOSE_REASON_LABELS, CONTACT_LEVEL_LABELS, LEAD_ACTIVITY_KIND_LABELS, PRIORITY_LABELS } from '../lib/labels'
import { CONTACT_LEVEL_HINTS, NEXT_STEP_STYLES, nextStepLabel, nextStepStatus, suggestContactLevel } from '../lib/leadRules'
import { useStageChange } from './StageChangeDialog'
import { RichText, RichTextarea } from './RichText'
import { Badge, Button, Card, ColorBadge, ConfirmDialog, CONTACT_LEVEL_TONES, cx, ErrorNote, Field, Input, Modal, PageLoader, Select } from './ui'

const ACTIVITY_ICONS: Record<string, any> = {
  mensaje_enviado: Send,
  seguimiento: Repeat,
  respuesta_recibida: MailOpen,
  llamada: PhoneCall,
  propuesta_enviada: FileText,
  nota: StickyNote,
}

const emptyActivity = () => ({ kind: 'nota', description: '', date: new Date().toISOString().slice(0, 10) })

/** Crear o editar una actividad. Si `activity` viene, edita esa (PUT); si no, crea una nueva. */
function ActivityModal({ open, onClose, leadId, activity }: { open: boolean; onClose: () => void; leadId: string; activity?: any | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyActivity())

  useEffect(() => {
    if (open) setForm(activity ? { kind: activity.kind || 'nota', description: activity.description || '', date: activity.date || '' } : emptyActivity())
  }, [open, activity])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const data = { kind: form.kind, date: form.date, description: form.description || null }
      return activity ? rest.update('lead-activities', activity.documentId, data) : rest.create('lead-activities', { ...data, lead: leadId })
    },
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
      size="lg"
      title={activity ? 'Editar actividad' : 'Agregar actividad'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.kind || !form.date}>
            {activity ? 'Guardar cambios' : 'Agregar'}
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
        <Field label="Nota" hint="Opcional. Puedes usar **negrita**, *cursiva* y listas con “- ”; las etiquetas tipo “CONEXIÓN:” se resaltan solas.">
          <RichTextarea value={form.description} onChange={(v) => set('description', v)} placeholder="Qué pasó en este contacto, o el mensaje que se envió…" />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

/** Fila de solo lectura: etiqueta arriba, valor abajo, "—" si está vacío. */
function ViewRow({ label, children, empty }: { label: string; children?: ReactNode; empty?: boolean }) {
  return (
    <div className="border-b border-slate-100 py-2.5 last:border-b-0">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm text-slate-900">{empty ? <span className="text-slate-300">—</span> : children}</div>
    </div>
  )
}

function ExternalHref({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 break-all text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700 hover:decoration-brand-500"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ExternalLink size={12} className="shrink-0" />
    </a>
  )
}

const phoneHref = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `tel:${raw.replace(/\s+/g, '')}`)

type ContactForm = { name: string; role: string; email: string; phone: string; linkedinUrl: string }
const emptyContact = (): ContactForm => ({ name: '', role: '', email: '', phone: '', linkedinUrl: '' })

const formFromLead = (lead: any) => ({
  companyName: lead.companyName || '',
  contacts: ((lead.contacts || []) as any[]).map((c) => ({
    name: c.name || '',
    role: c.role || '',
    email: c.email || '',
    phone: c.phone || '',
    linkedinUrl: c.linkedinUrl || '',
  })) as ContactForm[],
  contactLevel: lead.contactLevel || '',
  website: lead.website || '',
  linkedinUrl: lead.linkedinUrl || '',
  country: lead.country || '',
  source: lead.source?.documentId || '',
  ownerName: lead.ownerName || '',
  capturedAt: lead.capturedAt || '',
  qualificationScore: lead.qualificationScore ?? '',
  nextFollowUpDate: lead.nextFollowUpDate || '',
  closeReason: lead.closeReason || '',
  notes: lead.notes || '',
})

/**
 * Detalle completo de un lead. Se usa en la página /leads/:id y, embebido, dentro del modal grande
 * del tablero (así no se pierden los filtros al abrir un lead).
 */
export default function LeadDetailPanel({ documentId, embedded = false, onDeleted }: { documentId: string; embedded?: boolean; onDeleted?: () => void }) {
  const qc = useQueryClient()
  const [activityModal, setActivityModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<any | null>(null)
  const [deletingActivity, setDeletingActivity] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', documentId],
    queryFn: () =>
      rest.one('leads', documentId, {
        populate: { stage: true, source: true, contacts: true, activities: true, convertedToClient: true },
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
    setEditing(false)
  }, [documentId])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))
  const setContact = (i: number, k: keyof ContactForm, v: string) =>
    setForm((f: any) => ({ ...f, contacts: f.contacts.map((c: ContactForm, j: number) => (j === i ? { ...c, [k]: v } : c)) }))
  const addContact = () => setForm((f: any) => ({ ...f, contacts: [...f.contacts, emptyContact()] }))
  const removeContact = (i: number) => setForm((f: any) => ({ ...f, contacts: f.contacts.filter((_: ContactForm, j: number) => j !== i) }))

  const startEditing = () => {
    const next = formFromLead(lead)
    if (!next.contacts.length) next.contacts = [emptyContact()]
    setForm(next)
    setEditing(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const contacts = (form.contacts as ContactForm[])
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          role: c.role || null,
          email: c.email || null,
          phone: c.phone || null,
          linkedinUrl: c.linkedinUrl || null,
        }))
      return rest.update('leads', documentId, {
        companyName: form.companyName.trim(),
        contacts,
        contactLevel: form.contactLevel || suggestContactLevel(contacts),
        website: form.website || null,
        linkedinUrl: form.linkedinUrl || null,
        country: form.country || null,
        source: form.source || null,
        ownerName: form.ownerName || null,
        capturedAt: form.capturedAt || null,
        qualificationScore: form.qualificationScore === '' ? null : Number(form.qualificationScore),
        nextFollowUpDate: form.nextFollowUpDate || null,
        closeReason: form.closeReason || null,
        notes: form.notes || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', documentId] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      setEditing(false)
    },
  })

  const urgencyMutation = useMutation({
    mutationFn: (urgency: string) => rest.update('leads', documentId, { urgency }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', documentId] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  // Próximo paso editable desde el encabezado, sin entrar al modo edición.
  const nextStepMutation = useMutation({
    mutationFn: (nextFollowUpDate: string) => rest.update('leads', documentId, { nextFollowUpDate: nextFollowUpDate || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', documentId] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const stageChange = useStageChange()

  const convertMutation = useMutation({
    mutationFn: () => api(`/leads/${documentId}/convert-to-client`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', documentId] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })

  const deleteActivityMutation = useMutation({
    mutationFn: (id: string) => rest.remove('lead-activities', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', documentId] })
      qc.invalidateQueries({ queryKey: ['lead-activities'] })
      setDeletingActivity(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => rest.remove('leads', documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onDeleted?.()
    },
  })

  if (isLoading) return <PageLoader />
  if (error || !lead) return <ErrorNote error={error || new Error('Lead no encontrado')} />

  // Orden cronológico: el primer contacto arriba y los siguientes debajo, como una conversación.
  const activities = [...(lead.activities || [])].sort(
    (a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const canConvert = lead.stage?.outcome === 'won' && !lead.convertedToClient
  const contacts: any[] = lead.contacts || []
  const primary = contacts[0]
  const suggested = editing ? suggestContactLevel(form.contacts) : null
  const subtitle =
    [primary ? [primary.name, primary.role].filter(Boolean).join(' · ') : '', lead.country].filter(Boolean).join(' · ') || 'Sin contacto asignado'
  const stepStatus = nextStepStatus(lead)
  const stepStyle = stepStatus ? NEXT_STEP_STYLES[stepStatus] : null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {embedded ? (
            <p className="text-sm text-slate-500">
              {subtitle}
              <Link to={`/leads/${documentId}`} className="ml-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                Abrir en página completa <ExternalLink size={11} />
              </Link>
            </p>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{lead.companyName}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className={cx('mb-1 block text-[11px] font-medium uppercase tracking-wide', stepStyle && stepStatus !== 'ok' ? stepStyle.text : 'text-slate-400')}>
              {stepStatus && stepStatus !== 'ok' ? nextStepLabel(stepStatus, lead.nextFollowUpDate).replace(/ · .*$/, '') : 'Próximo paso'}
            </span>
            <Input
              type="date"
              value={lead.nextFollowUpDate || ''}
              onChange={(e) => nextStepMutation.mutate(e.target.value)}
              className={cx('py-1.5', stepStyle?.field)}
              style={{ width: '10.5rem' }}
              title="Fecha del próximo paso con este lead"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Urgencia</span>
            <Select value={lead.urgency || ''} onChange={(e) => urgencyMutation.mutate(e.target.value)} className="py-1.5" style={{ width: '8.5rem' }}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Etapa</span>
            <Select
              value={lead.stage?.documentId || ''}
              onChange={(e) => stageChange.request(lead, (stages || []).find((s: any) => s.documentId === e.target.value))}
              className="py-1.5"
              style={{ width: '12rem' }}
              title={lead.stage?.description || undefined}
            >
              {(stages || []).map((s: any) => (
                <option key={s.documentId} value={s.documentId}>
                  {s.name}
                </option>
              ))}
            </Select>
          </label>
          {lead.convertedToClient ? (
            <Badge tone="green">Convertido a cliente</Badge>
          ) : canConvert ? (
            <Button icon={UserCheck} onClick={() => convertMutation.mutate()} loading={convertMutation.isPending}>
              Convertir a cliente
            </Button>
          ) : null}
        </div>
      </div>

      {stageChange.error && !stageChange.dialogOpen ? (
        <div className="mb-4">
          <ErrorNote error={new Error(stageChange.error)} />
        </div>
      ) : null}
      {urgencyMutation.error ? (
        <div className="mb-4">
          <ErrorNote error={urgencyMutation.error} />
        </div>
      ) : null}
      {nextStepMutation.error ? (
        <div className="mb-4">
          <ErrorNote error={nextStepMutation.error} />
        </div>
      ) : null}
      {convertMutation.error ? (
        <div className="mb-4">
          <ErrorNote error={convertMutation.error} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(420px,2fr)_3fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Datos del lead</p>
            {!editing ? (
              <Button size="sm" variant="secondary" icon={Pencil} onClick={startEditing}>
                Editar
              </Button>
            ) : null}
          </div>

          {editing ? (
            <div className="space-y-4">
              <Field label="Empresa *">
                <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="País">
                  <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
                </Field>
                <Field label="Captado el">
                  <Input type="date" value={form.capturedAt} onChange={(e) => set('capturedAt', e.target.value)} />
                </Field>
              </div>
              <Field label="Sitio web">
                <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="LinkedIn de la empresa">
                <Input value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/company/…" />
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contactos</p>
                  <button onClick={addContact} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Plus size={13} /> Agregar contacto
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.contacts as ContactForm[]).map((c, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{i === 0 ? 'Contacto principal' : `Contacto ${i + 1}`}</span>
                        <button onClick={() => removeContact(i)} title="Quitar contacto" className="rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-600">
                          <X size={13} />
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2.5">
                          <Field label="Nombre *">
                            <Input value={c.name} onChange={(e) => setContact(i, 'name', e.target.value)} />
                          </Field>
                          <Field label="Cargo">
                            <Input value={c.role} onChange={(e) => setContact(i, 'role', e.target.value)} placeholder="CEO, Gerente…" />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <Field label="Correo">
                            <Input type="email" value={c.email} onChange={(e) => setContact(i, 'email', e.target.value)} />
                          </Field>
                          <Field label="Teléfono o WhatsApp">
                            <Input value={c.phone} onChange={(e) => setContact(i, 'phone', e.target.value)} />
                          </Field>
                        </div>
                        <Field label="LinkedIn">
                          <Input value={c.linkedinUrl} onChange={(e) => setContact(i, 'linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
                        </Field>
                      </div>
                    </div>
                  ))}
                  {!form.contacts.length ? <p className="text-xs text-slate-400">Sin contactos. Agrega al menos uno para poder escribirle.</p> : null}
                </div>
              </div>

              <Field
                label="Nivel de contacto"
                hint={suggested ? `Sugerido según los contactos: ${CONTACT_LEVEL_LABELS[suggested]} · ${CONTACT_LEVEL_HINTS[suggested]}` : undefined}
              >
                <Select value={form.contactLevel} onChange={(e) => set('contactLevel', e.target.value)}>
                  <option value="">Usar el sugerido</option>
                  {Object.entries(CONTACT_LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v} — {CONTACT_LEVEL_HINTS[k]}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Origen">
                  <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
                    <option value="">Sin origen</option>
                    {(sources || []).map((s: any) => (
                      <option key={s.documentId} value={s.documentId}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Dueño del lead">
                  <Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Quién lo trabaja" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Puntaje (0–12)" hint="Menos de 7: no se hace propuesta">
                  <Input type="number" min={0} max={12} step={1} value={form.qualificationScore} onChange={(e) => set('qualificationScore', e.target.value)} />
                </Field>
                <Field label="Próximo paso">
                  <Input type="date" value={form.nextFollowUpDate} onChange={(e) => set('nextFollowUpDate', e.target.value)} />
                </Field>
              </div>
              <Field label="Motivo de cierre">
                <Select value={form.closeReason} onChange={(e) => set('closeReason', e.target.value)}>
                  <option value="">—</option>
                  {Object.entries(CLOSE_REASON_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Notas" hint="Puedes usar **negrita**, *cursiva* y listas con “- ”.">
                <RichTextarea value={form.notes} onChange={(v) => set('notes', v)} />
              </Field>
              {saveMutation.error ? <ErrorNote error={saveMutation.error} /> : null}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.companyName?.trim()}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <ViewRow label="Nivel de contacto" empty={!lead.contactLevel}>
                  {lead.contactLevel ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <Badge tone={CONTACT_LEVEL_TONES[lead.contactLevel] || 'gray'}>{CONTACT_LEVEL_LABELS[lead.contactLevel]}</Badge>
                      <span className="text-xs text-slate-400">{CONTACT_LEVEL_HINTS[lead.contactLevel]}</span>
                    </span>
                  ) : null}
                </ViewRow>

                <div className="border-b border-slate-100 py-2.5">
                  <p className="text-xs text-slate-500">Contactos</p>
                  {!contacts.length ? (
                    <p className="mt-0.5 text-sm text-slate-300">—</p>
                  ) : (
                    <div className="mt-1.5 space-y-2.5">
                      {contacts.map((c: any, i: number) => (
                        <div key={c.id ?? i} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                          <p className="text-sm font-medium text-slate-900">
                            {c.name}
                            {c.role ? <span className="ml-1.5 font-normal text-slate-500">· {c.role}</span> : null}
                            {i === 0 && contacts.length > 1 ? <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">principal</span> : null}
                          </p>
                          <div className="mt-1 flex flex-col gap-0.5 text-sm">
                            {c.email ? <ExternalHref href={`mailto:${c.email}`}>{c.email}</ExternalHref> : null}
                            {c.phone ? <ExternalHref href={phoneHref(c.phone)}>{c.phone}</ExternalHref> : null}
                            {c.linkedinUrl ? <ExternalHref href={c.linkedinUrl}>{c.linkedinUrl}</ExternalHref> : null}
                            {!c.email && !c.phone && !c.linkedinUrl ? <span className="text-xs text-slate-400">Sin datos de contacto</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <ViewRow label="Sitio web" empty={!lead.website}>
                  {lead.website ? <ExternalHref href={lead.website}>{lead.website}</ExternalHref> : null}
                </ViewRow>
                <ViewRow label="LinkedIn de la empresa" empty={!lead.linkedinUrl}>
                  {lead.linkedinUrl ? <ExternalHref href={lead.linkedinUrl}>{lead.linkedinUrl}</ExternalHref> : null}
                </ViewRow>
                <ViewRow label="País" empty={!lead.country}>
                  {lead.country}
                </ViewRow>
                <ViewRow label="Origen" empty={!lead.source}>
                  {lead.source ? <ColorBadge color={lead.source.color}>{lead.source.name}</ColorBadge> : null}
                </ViewRow>
                <ViewRow label="Captado el" empty={!lead.capturedAt}>
                  {lead.capturedAt ? fmtDate(lead.capturedAt) : null}
                </ViewRow>
                <ViewRow label="Dueño del lead" empty={!lead.ownerName}>
                  {lead.ownerName}
                </ViewRow>
                <ViewRow label="Puntaje de calificación (0–12)" empty={lead.qualificationScore == null}>
                  <span className={lead.qualificationScore >= 7 ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-900'}>{lead.qualificationScore}</span>
                  {lead.qualificationScore != null && lead.qualificationScore < 7 ? (
                    <span className="ml-2 text-xs text-slate-400">Menos de 7: no se hace propuesta</span>
                  ) : null}
                </ViewRow>
                <ViewRow label="Próximo paso" empty={!lead.nextFollowUpDate}>
                  {lead.nextFollowUpDate ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className={stepStyle && stepStatus !== 'ok' ? cx('font-medium', stepStyle.text) : undefined}>{fmtDate(lead.nextFollowUpDate)}</span>
                      {stepStatus === 'overdue' ? <Badge tone="red">Vencido</Badge> : null}
                      {stepStatus === 'today' ? <Badge tone="amber">Vence hoy</Badge> : null}
                      {stepStatus === 'soon' ? <Badge tone="amber">Vence pronto</Badge> : null}
                    </span>
                  ) : null}
                </ViewRow>
                <ViewRow label="Motivo de cierre" empty={!lead.closeReason}>
                  {CLOSE_REASON_LABELS[lead.closeReason]}
                </ViewRow>
                <ViewRow label="Última actividad" empty={!lead.lastActivityAt}>
                  {lead.lastActivityAt ? fmtDate(lead.lastActivityAt) : null}
                </ViewRow>
                <ViewRow label="Notas" empty={!lead.notes}>
                  {lead.notes ? <RichText text={lead.notes} /> : null}
                </ViewRow>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setDeleting(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                >
                  <Trash2 size={13} />
                  Eliminar este lead
                </button>
              </div>
            </>
          )}
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
                  <div key={a.documentId} className="group flex gap-3 rounded-lg p-2 -m-2 hover:bg-slate-50">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="blue">{LEAD_ACTIVITY_KIND_LABELS[a.kind] ?? a.kind}</Badge>
                        <span className="text-xs text-slate-400">
                          {fmtDate(a.date)}
                          {a.loggedByName ? ` · ${a.loggedByName}` : ''}
                        </span>
                        <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            onClick={() => setEditingActivity(a)}
                            title="Editar actividad"
                            className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingActivity(a)}
                            title="Eliminar actividad"
                            className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      </div>
                      {a.description ? <RichText text={a.description} className="mt-1.5" /> : null}
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
      <ActivityModal open={!!editingActivity} onClose={() => setEditingActivity(null)} leadId={documentId} activity={editingActivity} />
      <ConfirmDialog
        open={!!deletingActivity}
        onClose={() => setDeletingActivity(null)}
        onConfirm={() => deletingActivity && deleteActivityMutation.mutate(deletingActivity.documentId)}
        loading={deleteActivityMutation.isPending}
        title="Eliminar actividad"
        message={`¿Eliminar esta actividad (${LEAD_ACTIVITY_KIND_LABELS[deletingActivity?.kind] ?? 'actividad'} del ${deletingActivity?.date ? fmtDate(deletingActivity.date) : '—'})?`}
      />
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
