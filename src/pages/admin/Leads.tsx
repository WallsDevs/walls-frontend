import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutGrid, List, Settings2, Target, Plus } from 'lucide-react'
import { rest } from '../../lib/api'
import { money, todayISO } from '../../lib/format'
import { useAuth } from '../../auth/AuthContext'
import { LEAD_SOURCE_LABELS, LEAD_SOURCE_TONES } from '../../lib/labels'
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  SearchInput,
  Select,
  Td,
  Textarea,
  Th,
  TableWrap,
  cx,
} from '../../components/ui'

const emptyForm = () => ({
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  linkedinUrl: '',
  country: '',
  estimatedValue: '',
  currency: 'USD',
  source: 'other',
  ownerName: '',
  nextFollowUpDate: '',
  notes: '',
  stage: '',
})

export function LeadModal({
  open,
  onClose,
  lead,
  stages,
  defaultStage,
}: {
  open: boolean
  onClose: () => void
  lead?: any | null
  stages: any[]
  defaultStage?: string
}) {
  const qc = useQueryClient()
  const { auth } = useAuth()
  const [form, setForm] = useState<any>(emptyForm())

  const myName = auth?.me.profile?.firstName
    ? `${auth.me.profile.firstName} ${auth.me.profile.lastName ?? ''}`.trim()
    : auth?.me.profile?.name || auth?.me.username || ''

  useEffect(() => {
    if (!open) return
    setForm(
      lead
        ? {
            companyName: lead.companyName || '',
            contactName: lead.contactName || '',
            contactEmail: lead.contactEmail || '',
            contactPhone: lead.contactPhone || '',
            website: lead.website || '',
            linkedinUrl: lead.linkedinUrl || '',
            country: lead.country || '',
            estimatedValue: String(lead.estimatedValue ?? ''),
            currency: lead.currency || 'USD',
            source: lead.source || 'other',
            ownerName: lead.ownerName || '',
            nextFollowUpDate: lead.nextFollowUpDate || '',
            notes: lead.notes || '',
            stage: lead.stage?.documentId || '',
          }
        : { ...emptyForm(), ownerName: myName, stage: defaultStage || stages[0]?.documentId || '' },
    )
  }, [open, lead, defaultStage])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        companyName: form.companyName,
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        website: form.website || null,
        linkedinUrl: form.linkedinUrl || null,
        country: form.country || null,
        estimatedValue: Number(form.estimatedValue) || 0,
        currency: form.currency || 'USD',
        source: form.source,
        ownerName: form.ownerName || null,
        nextFollowUpDate: form.nextFollowUpDate || null,
        notes: form.notes || null,
        stage: form.stage || null,
      }
      return lead ? rest.update('leads', lead.documentId, data) : rest.create('leads', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? 'Editar lead' : 'Nuevo lead'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.companyName}>
            {lead ? 'Guardar cambios' : 'Crear lead'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Empresa *">
          <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Nombre de la empresa" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Persona de contacto">
            <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
          </Field>
        </div>
        <Field label="Correo">
          <Input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sitio web">
            <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="LinkedIn">
            <Input value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
          </Field>
        </div>
        <Field label="País">
          <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor estimado">
            <Input type="number" min={0} step="100" value={form.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} placeholder="15000" />
          </Field>
          <Field label="Moneda">
            <Input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} placeholder="USD" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origen">
            <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
              {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etapa">
            <Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {stages.map((s: any) => (
                <option key={s.documentId} value={s.documentId}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dueño del lead" hint="Quién lo está trabajando">
            <Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
          </Field>
          <Field label="Próximo seguimiento">
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
  const [view, setView] = useState<ViewMode>('board')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [modal, setModal] = useState<{ open: boolean; lead?: any; defaultStage?: string }>({ open: false })

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () =>
      rest.list('leads', {
        populate: { stage: true },
        sort: 'updatedAt:desc',
        pagination: { pageSize: 300 },
      }),
  })

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => rest.list('pipeline-stages', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })

  const today = todayISO()
  const isOverdue = (l: any) => (!l.stage || l.stage.outcome === 'open') && l.nextFollowUpDate && l.nextFollowUpDate < today

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (leads || []).filter((l: any) => {
      if (q && !l.companyName.toLowerCase().includes(q) && !(l.contactName || '').toLowerCase().includes(q)) return false
      if (stageFilter && l.stage?.documentId !== stageFilter) return false
      return true
    })
  }, [leads, search, stageFilter])

  const overdueCount = (leads || []).filter(isOverdue).length
  const totalValue = filtered.reduce((s: number, l: any) => s + Number(l.estimatedValue || 0), 0)
  const hasOrphans = filtered.some((l: any) => !l.stage)
  const boardColumns = hasOrphans
    ? [...(stages || []), { documentId: '__none__', name: 'Sin etapa', color: '#cbd5e1', __orphan: true }]
    : stages || []

  if (isLoading || stagesLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${filtered.length} leads · ${money(totalValue)} en el embudo`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {overdueCount > 0 ? <Badge tone="red">{overdueCount} vencidos</Badge> : null}
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
            <Button icon={Plus} onClick={() => setModal({ open: true })}>
              Nuevo lead
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar lead…" />
        </div>
        {view === 'list' ? (
          <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="w-full sm:w-52">
            <option value="">Todas las etapas</option>
            {(stages || []).map((s: any) => (
              <option key={s.documentId} value={s.documentId}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Link to="/pipeline-stages" className="ml-0 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 sm:ml-auto">
          <Settings2 size={15} /> Configurar etapas
        </Link>
      </div>

      {!stages?.length ? (
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
            <Button icon={Plus} onClick={() => setModal({ open: true })}>
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
              <Th>Origen</Th>
              <Th right>Valor</Th>
              <Th>Etapa</Th>
              <Th>Dueño</Th>
              <Th>Seguimiento</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l.documentId} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/leads/${l.documentId}`)}>
                <Td>
                  <p className="font-medium text-slate-900">{l.companyName}</p>
                </Td>
                <Td className="text-slate-600">{l.contactName || '—'}</Td>
                <Td>
                  <Badge tone={LEAD_SOURCE_TONES[l.source] || 'gray'}>{LEAD_SOURCE_LABELS[l.source]}</Badge>
                </Td>
                <Td right className="font-medium">{money(l.estimatedValue, l.currency)}</Td>
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
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${boardColumns.length}, minmax(0, 1fr))` }}>
          {boardColumns.map((s: any) => {
            const list = s.__orphan ? filtered.filter((l: any) => !l.stage) : filtered.filter((l: any) => l.stage?.documentId === s.documentId)
            return (
              <div key={s.documentId} className="rounded-xl bg-slate-200/50 p-2.5">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-block size-2 rounded-full" style={{ background: s.color || '#94a3b8' }} />
                    {s.name}
                  </span>
                  <span className="rounded-full bg-white px-1.5 text-xs text-slate-500">{list.length}</span>
                </div>
                {s.__orphan ? (
                  <p className="mb-2 px-1 text-xs text-slate-400">Se quedaron sin etapa (se borró la que tenían). Ábrelos y asígnales una.</p>
                ) : null}
                <div className="space-y-2">
                  {list.map((l: any) => {
                    const overdue = isOverdue(l)
                    return (
                      <button
                        key={l.documentId}
                        onClick={() => navigate(`/leads/${l.documentId}`)}
                        className={cx(
                          'w-full rounded-lg border bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md',
                          overdue ? 'border-red-200' : 'border-slate-200',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{l.companyName}</p>
                            {l.contactName ? <p className="truncate text-xs text-slate-500">{l.contactName}</p> : null}
                          </div>
                          {l.ownerName ? (
                            <span
                              title={l.ownerName}
                              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700"
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
                        <div className="mt-2 flex items-center gap-1.5">
                          <Badge tone={LEAD_SOURCE_TONES[l.source] || 'gray'}>{LEAD_SOURCE_LABELS[l.source]}</Badge>
                          <span className="ml-auto text-xs font-semibold text-slate-900">{money(l.estimatedValue, l.currency)}</span>
                        </div>
                        {overdue ? (
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-xs text-red-600">Venció {l.nextFollowUpDate}</span>
                            <Badge tone="red">Vencido</Badge>
                          </div>
                        ) : l.nextFollowUpDate ? (
                          <p className="mt-1.5 text-xs text-slate-400">Seguimiento {l.nextFollowUpDate}</p>
                        ) : null}
                      </button>
                    )
                  })}
                  {!list.length && <p className="px-1 py-3 text-center text-xs text-slate-400">Vacío</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <LeadModal open={modal.open} onClose={() => setModal({ open: false })} lead={modal.lead} stages={stages || []} defaultStage={modal.defaultStage} />
    </div>
  )
}
