import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Globe, Link2, LayoutGrid, List, Settings2, Tags, Target, Plus, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import { todayISO } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'
import { CONTACT_LEVEL_LABELS, PRIORITY_LABELS } from '../../lib/labels'
import { defaultStage } from '../../lib/leadRules'
import { currentWeekKey, weekKey, weekLabel } from '../../lib/weeks'
import { useStageChange } from '../../components/StageChangeDialog'
import LeadDetailPanel from '../../components/LeadDetailPanel'
import {
  Badge,
  Button,
  ColorBadge,
  ConfirmDialog,
  CONTACT_LEVEL_TONES,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  PRIORITY_TONES,
  SearchInput,
  Select,
  Td,
  Textarea,
  Th,
  TableWrap,
  cx,
} from '../../components/ui'

const URGENCY_STRIPE: Record<string, string> = {
  low: '#94a3b8',
  medium: '#2a78d6',
  high: '#d97706',
  urgent: '#dc2626',
}

const WEEK_KINDS: Array<{ kind: string; label: string }> = [
  { kind: 'mensaje_enviado', label: 'Mensajes enviados' },
  { kind: 'respuesta_recibida', label: 'Respuestas recibidas' },
  { kind: 'llamada', label: 'Llamadas' },
  { kind: 'propuesta_enviada', label: 'Propuestas enviadas' },
]

const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const primaryContact = (l: any) => (l.contacts || [])[0]
const contactLine = (l: any) => {
  const c = primaryContact(l)
  const who = c ? [c.name, c.role].filter(Boolean).join(' · ') : ''
  return [who, l.country].filter(Boolean).join(' · ')
}
const leadWeek = (l: any) => weekKey(l.capturedAt || l.createdAt)

const emptyForm = () => ({
  companyName: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',
  contactPhone: '',
  contactLinkedin: '',
  website: '',
  linkedinUrl: '',
  country: '',
  source: '',
  urgency: 'medium',
  ownerName: '',
  capturedAt: todayISO(),
  nextFollowUpDate: '',
  notes: '',
  stage: '',
})

export function LeadModal({ open, onClose, stages, sources }: { open: boolean; onClose: () => void; stages: any[]; sources: any[] }) {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const [form, setForm] = useState<any>(emptyForm())

  const myName = auth?.me.profile?.firstName
    ? `${auth.me.profile.firstName} ${auth.me.profile.lastName ?? ''}`.trim()
    : auth?.me.profile?.name || auth?.me.username || ''

  useEffect(() => {
    if (!open) return
    setForm({ ...emptyForm(), ownerName: myName, stage: defaultStage(stages)?.documentId || '' })
  }, [open])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () =>
      rest.create('leads', {
        companyName: form.companyName,
        contacts: form.contactName.trim()
          ? [
              {
                name: form.contactName.trim(),
                role: form.contactRole || null,
                email: form.contactEmail || null,
                phone: form.contactPhone || null,
                linkedinUrl: form.contactLinkedin || null,
              },
            ]
          : [],
        website: form.website || null,
        linkedinUrl: form.linkedinUrl || null,
        country: form.country || null,
        source: form.source || null,
        urgency: form.urgency,
        ownerName: form.ownerName || null,
        capturedAt: form.capturedAt || null,
        nextFollowUpDate: form.nextFollowUpDate || null,
        notes: form.notes || null,
        stage: form.stage || defaultStage(stages)?.documentId || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo lead"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.companyName}>
            Crear lead
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Empresa *">
          <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Nombre de la empresa" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="País">
            <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
          </Field>
          <Field label="Captado el">
            <Input type="date" value={form.capturedAt} onChange={(e) => set('capturedAt', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sitio web">
            <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="LinkedIn de la empresa">
            <Input value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/company/…" />
          </Field>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto principal</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre">
                <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
              </Field>
              <Field label="Cargo">
                <Input value={form.contactRole} onChange={(e) => set('contactRole', e.target.value)} placeholder="CEO, Gerente…" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Correo">
                <Input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
              </Field>
              <Field label="Teléfono o WhatsApp">
                <Input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
              </Field>
            </div>
            <Field label="LinkedIn de la persona">
              <Input value={form.contactLinkedin} onChange={(e) => set('contactLinkedin', e.target.value)} placeholder="https://linkedin.com/in/…" />
            </Field>
            <p className="text-[11px] text-slate-400">Puedes agregar más contactos desde el detalle del lead. El nivel de contacto se sugiere solo.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Origen">
            <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
              <option value="">Sin origen</option>
              {sources.map((s: any) => (
                <option key={s.documentId} value={s.documentId}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Urgencia">
            <Select value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Etapa" hint="Los leads nuevos entran en Por revisar">
          <Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
            {stages.map((s: any) => (
              <option key={s.documentId} value={s.documentId}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dueño del lead" hint="Quién lo está trabajando">
            <Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
          </Field>
          <Field label="Próximo paso">
            <Input type="date" value={form.nextFollowUpDate} onChange={(e) => set('nextFollowUpDate', e.target.value)} />
          </Field>
        </div>
        <Field label="Notas">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

type ViewMode = 'list' | 'board'

export default function Leads() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [view, setView] = useState<ViewMode>('board')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<any | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () =>
      rest.list('leads', {
        populate: { stage: true, source: true, contacts: true },
        sort: 'updatedAt:desc',
        pagination: { pageSize: 300 },
      }),
  })

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => rest.list('pipeline-stages', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => rest.list('lead-sources', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })

  const weekSince = daysAgoISO(7)
  const { data: weekActivities } = useQuery({
    queryKey: ['lead-activities', 'week', weekSince],
    queryFn: () =>
      rest.list('lead-activities', {
        filters: { date: { $gte: weekSince } },
        fields: ['kind', 'date'],
        pagination: { pageSize: 500 },
      }),
  })

  const stageChange = useStageChange()

  const removeMutation = useMutation({
    mutationFn: (id: string) => rest.remove('leads', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      setDeleting(null)
    },
  })

  const today = todayISO()
  const isOverdue = (l: any) => (!l.stage || l.stage.outcome === 'open') && l.nextFollowUpDate && l.nextFollowUpDate < today

  const countries = useMemo(
    () => Array.from(new Set((leads || []).map((l: any) => l.country).filter(Boolean))).sort(),
    [leads],
  )

  const thisWeek = currentWeekKey(0)
  const lastWeek = currentWeekKey(-1)
  const weeks = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of leads || []) {
      const k = leadWeek(l)
      counts[k] = (counts[k] || 0) + 1
    }
    return Object.entries(counts)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, count]) => ({ key, count }))
  }, [leads])
  const weekTarget = weekFilter === 'this' ? thisWeek : weekFilter === 'last' ? lastWeek : weekFilter

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (leads || []).filter((l: any) => {
      const c = primaryContact(l)
      if (q && !l.companyName.toLowerCase().includes(q) && !(c?.name || '').toLowerCase().includes(q)) return false
      if (stageFilter && l.stage?.documentId !== stageFilter) return false
      if (sourceFilter && l.source?.documentId !== sourceFilter) return false
      if (urgencyFilter && l.urgency !== urgencyFilter) return false
      if (countryFilter && l.country !== countryFilter) return false
      if (levelFilter && l.contactLevel !== levelFilter) return false
      if (weekTarget && leadWeek(l) !== weekTarget) return false
      if (overdueOnly && !isOverdue(l)) return false
      return true
    })
  }, [leads, search, stageFilter, sourceFilter, urgencyFilter, countryFilter, levelFilter, weekTarget, overdueOnly])

  const overdueCount = (leads || []).filter(isOverdue).length
  const hasActiveFilters = !!(search || stageFilter || sourceFilter || urgencyFilter || countryFilter || levelFilter || weekFilter || overdueOnly)
  const clearFilters = () => {
    setSearch('')
    setStageFilter('')
    setSourceFilter('')
    setUrgencyFilter('')
    setCountryFilter('')
    setLevelFilter('')
    setWeekFilter('')
    setOverdueOnly(false)
  }

  const boardColumns: any[] = stages || []
  const entryStageId = defaultStage(boardColumns)?.documentId
  // Las etapas finales (ganado / cerrado) empiezan colapsadas para dejar a la vista las de trabajo.
  const isCollapsed = (s: any) => collapsed[s.documentId] ?? s.outcome !== 'open'
  const toggleCollapsed = (s: any) => setCollapsed((c) => ({ ...c, [s.documentId]: !isCollapsed(s) }))

  const weekCounts = useMemo(() => {
    const byKind: Record<string, number> = {}
    for (const a of weekActivities || []) byKind[a.kind] = (byKind[a.kind] || 0) + 1
    const won = (leads || []).filter((l: any) => l.wonAt && String(l.wonAt).slice(0, 10) >= weekSince).length
    const captured = (leads || []).filter((l: any) => (l.capturedAt || String(l.createdAt).slice(0, 10)) >= weekSince).length
    return { byKind, won, captured }
  }, [weekActivities, leads, weekSince])

  // Lista agrupada por semana de captación, de la más reciente a la más antigua.
  const listGroups = useMemo(() => {
    const groups = new Map<string, any[]>()
    const sorted = [...filtered].sort((a, b) => ((a.capturedAt || a.createdAt) < (b.capturedAt || b.createdAt) ? 1 : -1))
    for (const l of sorted) {
      const k = leadWeek(l)
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(l)
    }
    return Array.from(groups.entries())
  }, [filtered])

  if (isLoading || stagesLoading || sourcesLoading) return <PageLoader />

  const renderCard = (l: any) => {
    const overdue = isOverdue(l)
    const line = contactLine(l)
    const hasLinkedin = l.linkedinUrl || (l.contacts || []).some((c: any) => c.linkedinUrl)
    return (
      <div
        key={l.documentId}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', l.documentId)
          e.dataTransfer.effectAllowed = 'move'
          setDraggingId(l.documentId)
        }}
        onDragEnd={() => {
          setDraggingId(null)
          setDragOverStage(null)
        }}
        onClick={() => setOpenLeadId(l.documentId)}
        className={cx(
          'group relative w-full cursor-grab overflow-hidden rounded-lg border bg-white py-3 pl-3.5 pr-3 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
          overdue ? 'border-red-200' : 'border-slate-200',
          draggingId === l.documentId && 'opacity-40',
        )}
      >
        {l.urgency ? <span className="absolute inset-y-0 left-0 w-1" style={{ background: URGENCY_STRIPE[l.urgency] || '#94a3b8' }} /> : null}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setDeleting(l)
          }}
          className="absolute right-2 top-2 rounded-lg p-1 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
        <div className="flex items-start justify-between gap-2 pr-5">
          <p className="truncate text-sm font-medium text-slate-900">{l.companyName}</p>
          {l.urgency ? <Badge tone={PRIORITY_TONES[l.urgency] || 'gray'}>{PRIORITY_LABELS[l.urgency]}</Badge> : null}
        </div>
        {line ? <p className="mt-0.5 truncate text-xs text-slate-500">{line}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {l.contactLevel ? <Badge tone={CONTACT_LEVEL_TONES[l.contactLevel] || 'gray'}>{CONTACT_LEVEL_LABELS[l.contactLevel]}</Badge> : null}
          {l.source ? <ColorBadge color={l.source.color}>{l.source.name}</ColorBadge> : null}
          {l.website ? (
            <span title={l.website} className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Globe size={11} />
            </span>
          ) : null}
          {hasLinkedin ? (
            <span title="LinkedIn" className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Link2 size={11} />
            </span>
          ) : null}
          {l.ownerName ? (
            <span
              title={l.ownerName}
              className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700"
            >
              {l.ownerName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p: string) => p[0])
                .join('')
                .toUpperCase()}
            </span>
          ) : null}
        </div>
        {overdue ? (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-red-600">Venció {l.nextFollowUpDate}</span>
            <Badge tone="red">Vencido</Badge>
          </div>
        ) : l.nextFollowUpDate ? (
          <p className="mt-1.5 text-xs text-slate-400">Próximo paso {l.nextFollowUpDate}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${filtered.length} leads`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {overdueCount > 0 ? (
              <button onClick={() => setOverdueOnly((v) => !v)}>
                <Badge tone="red">{overdueCount} vencidos</Badge>
              </button>
            ) : null}
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
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
            <Button icon={Plus} onClick={() => setModalOpen(true)}>
              Nuevo lead
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-52">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar lead…" />
        </div>
        <Select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className="w-full sm:w-52">
          <option value="">Todas las semanas</option>
          <option value="this">Esta semana ({weeks.find((w) => w.key === thisWeek)?.count || 0})</option>
          <option value="last">Semana pasada ({weeks.find((w) => w.key === lastWeek)?.count || 0})</option>
          {weeks
            .filter((w) => w.key !== thisWeek && w.key !== lastWeek)
            .map((w) => (
              <option key={w.key} value={w.key}>
                {weekLabel(w.key)} ({w.count})
              </option>
            ))}
        </Select>
        {view === 'list' ? (
          <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="w-full sm:w-44">
            <option value="">Todas las etapas</option>
            {boardColumns.map((s: any) => (
              <option key={s.documentId} value={s.documentId}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-full sm:w-44">
          <option value="">Todo nivel de contacto</option>
          {Object.entries(CONTACT_LEVEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="w-full sm:w-40">
          <option value="">Todos los orígenes</option>
          {(sources || []).map((s: any) => (
            <option key={s.documentId} value={s.documentId}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="w-full sm:w-36">
          <option value="">Toda urgencia</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        {countries.length > 1 ? (
          <Select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full sm:w-36">
            <option value="">Todo país</option>
            {countries.map((c: any) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        ) : null}
        <button
          onClick={() => setOverdueOnly((v) => !v)}
          disabled={overdueCount === 0}
          title={
            overdueCount === 0
              ? 'No hay leads vencidos: para que un lead aparezca aquí necesita una fecha de "Próximo paso" ya pasada'
              : undefined
          }
          className={cx(
            'whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            overdueOnly ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          Solo vencidos
        </button>
        {hasActiveFilters ? (
          <button onClick={clearFilters} className="text-sm font-medium text-slate-400 hover:text-slate-600">
            Limpiar filtros
          </button>
        ) : null}
        <div className="ml-0 flex items-center gap-3 sm:ml-auto">
          <Link to="/lead-sources" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            <Tags size={15} /> Configurar orígenes
          </Link>
          <Link to="/pipeline-stages" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            <Settings2 size={15} /> Configurar etapas
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Leads captados</p>
          <p className="text-lg font-semibold text-slate-900">{weekCounts.captured}</p>
        </div>
        {WEEK_KINDS.map((k) => (
          <div key={k.kind} className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{k.label}</p>
            <p className="text-lg font-semibold text-slate-900">{weekCounts.byKind[k.kind] || 0}</p>
          </div>
        ))}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">Ganados</p>
          <p className="text-lg font-semibold text-emerald-700">{weekCounts.won}</p>
        </div>
        <p className="col-span-2 -mt-1 text-[11px] text-slate-400 sm:col-span-3 lg:col-span-6">Esta semana · últimos 7 días</p>
      </div>

      {stageChange.error && !stageChange.dialogOpen ? (
        <div className="mb-3">
          <ErrorNote error={new Error(stageChange.error)} />
        </div>
      ) : null}

      {!boardColumns.length ? (
        <EmptyState
          icon={Target}
          title="Todavía no hay etapas de pipeline"
          description="Crea al menos una etapa para poder registrar leads."
          action={
            <Button icon={Settings2} onClick={() => navigate('/pipeline-stages')}>
              Configurar etapas
            </Button>
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          icon={Target}
          title="No hay leads con estos filtros"
          action={
            <Button icon={Plus} onClick={() => setModalOpen(true)}>
              Nuevo lead
            </Button>
          }
        />
      ) : view === 'list' ? (
        <TableWrap>
          <thead>
            <tr>
              <Th>Empresa</Th>
              <Th>Contacto</Th>
              <Th>Nivel</Th>
              <Th>Origen</Th>
              <Th>Urgencia</Th>
              <Th>Etapa</Th>
              <Th>Dueño</Th>
              <Th>Próximo paso</Th>
              <Th />
            </tr>
          </thead>
          {listGroups.map(([key, rows]) => (
            <tbody key={key}>
              <tr>
                <td colSpan={9} className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key === thisWeek ? 'Esta semana' : key === lastWeek ? 'Semana pasada' : weekLabel(key)}
                  <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
                    {key === thisWeek || key === lastWeek ? `${weekLabel(key)} · ` : ''}
                    {rows.length} {rows.length === 1 ? 'lead' : 'leads'}
                  </span>
                </td>
              </tr>
              {rows.map((l: any) => {
                const c = primaryContact(l)
                return (
                  <tr key={l.documentId} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenLeadId(l.documentId)}>
                    <Td>
                      <p className="font-medium text-slate-900">{l.companyName}</p>
                      {l.country ? <p className="text-xs text-slate-400">{l.country}</p> : null}
                    </Td>
                    <Td>
                      {c ? (
                        <>
                          <p className="text-slate-700">{c.name}</p>
                          {c.role ? <p className="text-xs text-slate-400">{c.role}</p> : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      {l.contactLevel ? <Badge tone={CONTACT_LEVEL_TONES[l.contactLevel] || 'gray'}>{CONTACT_LEVEL_LABELS[l.contactLevel]}</Badge> : '—'}
                    </Td>
                    <Td>{l.source ? <ColorBadge color={l.source.color}>{l.source.name}</ColorBadge> : '—'}</Td>
                    <Td>{l.urgency ? <Badge tone={PRIORITY_TONES[l.urgency] || 'gray'}>{PRIORITY_LABELS[l.urgency]}</Badge> : '—'}</Td>
                    <Td>
                      {l.stage ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full" style={{ background: l.stage.color || '#94a3b8' }} />
                          {l.stage.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-slate-600">{l.ownerName || '—'}</Td>
                    <Td>
                      {isOverdue(l) ? (
                        <Badge tone="red">Vencido</Badge>
                      ) : l.nextFollowUpDate ? (
                        <span className="text-slate-500">{l.nextFollowUpDate}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleting(l)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </TableWrap>
      ) : (
        <div
          className="grid gap-3 overflow-x-auto pb-2"
          style={{ gridTemplateColumns: boardColumns.map((s: any) => (isCollapsed(s) ? '3rem' : 'minmax(220px, 1fr)')).join(' ') }}
        >
          {boardColumns.map((s: any) => {
            const list = filtered.filter((l: any) => (l.stage?.documentId ?? entryStageId) === s.documentId)
            const columnCollapsed = isCollapsed(s)
            return (
              <div
                key={s.documentId}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverStage(s.documentId)
                }}
                onDragLeave={() => setDragOverStage((cur) => (cur === s.documentId ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  setDragOverStage(null)
                  setDraggingId(null)
                  if (!id) return
                  const lead = (leads || []).find((l: any) => l.documentId === id)
                  if (lead) stageChange.request(lead, s)
                }}
                className={cx(
                  'rounded-xl bg-slate-200/50 transition-colors',
                  columnCollapsed ? 'flex flex-col items-center gap-2 px-1 py-2.5' : 'p-2.5',
                  dragOverStage === s.documentId && 'bg-brand-100/60 ring-2 ring-brand-300',
                )}
              >
                {columnCollapsed ? (
                  <>
                    <button onClick={() => toggleCollapsed(s)} title={`Expandir ${s.name}`} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="rounded-full bg-white px-1.5 text-xs text-slate-500">{list.length}</span>
                    <span className="inline-block size-2 rounded-full" style={{ background: s.color || '#94a3b8' }} />
                    <span
                      title={s.description || undefined}
                      className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500 [writing-mode:vertical-rl] rotate-180"
                    >
                      {s.name}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span title={s.description || undefined} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span className="inline-block size-2 rounded-full" style={{ background: s.color || '#94a3b8' }} />
                        {s.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="rounded-full bg-white px-1.5 text-xs text-slate-500">{list.length}</span>
                        <button onClick={() => toggleCollapsed(s)} title={`Contraer ${s.name}`} className="rounded-md p-0.5 text-slate-400 hover:bg-white hover:text-slate-700">
                          <ChevronRight size={14} />
                        </button>
                      </span>
                    </div>
                    <div className="space-y-2">
                      {list.map(renderCard)}
                      {!list.length && <p className="px-1 py-3 text-center text-xs text-slate-400">Vacío</p>}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {stageChange.dialog}
      <Modal
        open={!!openLeadId}
        size="xl"
        title={(leads || []).find((l: any) => l.documentId === openLeadId)?.companyName || 'Lead'}
        onClose={() => setOpenLeadId(null)}
      >
        {openLeadId ? <LeadDetailPanel documentId={openLeadId} embedded onDeleted={() => setOpenLeadId(null)} /> : null}
      </Modal>
      <LeadModal open={modalOpen} onClose={() => setModalOpen(false)} stages={boardColumns} sources={sources || []} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeMutation.mutate(deleting.documentId)}
        loading={removeMutation.isPending}
        title="Eliminar lead"
        message={`¿Eliminar ${deleting?.companyName} y todo su historial de seguimiento?`}
      />
    </div>
  )
}
