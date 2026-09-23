import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Film, FileText, Image as ImageIcon, LayoutGrid, List, Megaphone, Plus, Sparkles, Tags, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_DOT,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_ORDER,
  CONTENT_STATUS_TONES,
  fromLocalInput,
  localDateKey,
  localTime,
  mediaKind,
  monthTitle,
  NETWORK_LABELS,
  NETWORK_TONES,
  shortDay,
  spainTime,
  toLocalInput,
  type MediaItem,
} from '../../lib/content'
import { usePersistedState } from '../../lib/usePersistedState'
import MediaField from '../../components/MediaField'
import SocialPreview from '../../components/SocialPreview'
import { RichTextarea } from '../../components/RichText'
import {
  Badge,
  Button,
  ConfirmDialog,
  cx,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  SearchInput,
  Select,
  Textarea,
} from '../../components/ui'

type ViewMode = 'calendar' | 'board' | 'list'
type Filters = { search: string; status: string; format: string; pillar: string; network: string }
const EMPTY_FILTERS: Filters = { search: '', status: '', format: '', pillar: '', network: '' }

const NETWORKS = Object.keys(NETWORK_LABELS)
const pad = (n: number) => String(n).padStart(2, '0')

type Publication = { network: string; url: string }

const emptyForm = () => ({
  title: '',
  status: 'idea',
  format: '',
  pillar: '',
  publishAt: '',
  body: '',
  firstComment: '',
  designPrompt: '',
  publications: [] as Publication[],
})

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* sin portapapeles: nada que hacer */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-40"
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? 'Copiado' : label}
    </button>
  )
}

/** Icono según el formato de la pieza. */
function FormatIcon({ format, size = 13 }: { format?: string; size?: number }) {
  if (format === 'video') return <Film size={size} />
  if (format === 'carrusel') return <FileText size={size} />
  if (format === 'imagen') return <ImageIcon size={size} />
  return <Megaphone size={size} />
}

/** Crear / editar una pieza de contenido. Formulario a la izquierda, archivos y publicación a la derecha. */
function ContentModal({ open, onClose, post, initialDate, pillars }: { open: boolean; onClose: () => void; post?: any | null; initialDate?: string; pillars: any[] }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm())
  const [media, setMedia] = useState<MediaItem[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    if (post) {
      setForm({
        title: post.title || '',
        status: post.status || 'idea',
        format: post.format || '',
        pillar: post.pillar?.documentId || '',
        publishAt: toLocalInput(post.publishAt),
        body: post.body || '',
        firstComment: post.firstComment || '',
        designPrompt: post.designPrompt || '',
        publications: (post.publications || []).map((p: any) => ({ network: p.network, url: p.url || '' })),
      })
      setMedia((post.media || []).map((m: any) => ({ id: m.id, url: m.url, name: m.name, mime: m.mime, size: m.size ? m.size * 1024 : undefined })))
    } else {
      setForm({ ...emptyForm(), publishAt: initialDate ? `${initialDate}T10:00` : '' })
      setMedia([])
    }
  }, [open, post, initialDate])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))
  const setPub = (i: number, k: keyof Publication, v: string) =>
    set(
      'publications',
      form.publications.map((p: Publication, j: number) => (j === i ? { ...p, [k]: v } : p)),
    )
  const toggleNetwork = (network: string) => {
    const has = form.publications.some((p: Publication) => p.network === network)
    set('publications', has ? form.publications.filter((p: Publication) => p.network !== network) : [...form.publications, { network, url: '' }])
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['content-posts'] })

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        title: form.title.trim(),
        status: form.status,
        format: form.format || null,
        pillar: form.pillar || null,
        publishAt: fromLocalInput(form.publishAt),
        body: form.body || null,
        firstComment: form.firstComment || null,
        designPrompt: form.designPrompt || null,
        publications: form.publications.map((p: Publication) => ({ network: p.network, url: p.url?.trim() || null })),
        media: media.map((m) => m.id),
      }
      return post ? rest.update('content-posts', post.documentId, data) : rest.create('content-posts', data)
    },
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => rest.remove('content-posts', post.documentId),
    onSuccess: () => {
      invalidate()
      setConfirmDelete(false)
      onClose()
    },
  })

  const publishedAt = form.publishAt ? fromLocalInput(form.publishAt) : null

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        title={post ? post.title || 'Editar contenido' : 'Nuevo contenido'}
        footer={
          <>
            {post ? (
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)} className="mr-auto">
                Eliminar
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.title.trim()}>
              {post ? 'Guardar cambios' : 'Crear contenido'}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <Field label="Título *">
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Tu web tiene visitas, pero no ventas" autoFocus={!post} />
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Estado">
                <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {CONTENT_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {CONTENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Formato">
                <Select value={form.format} onChange={(e) => set('format', e.target.value)}>
                  <option value="">—</option>
                  {Object.entries(CONTENT_FORMAT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Pilar">
                <Select value={form.pillar} onChange={(e) => set('pillar', e.target.value)}>
                  <option value="">—</option>
                  {pillars.map((p: any) => (
                    <option key={p.documentId} value={p.documentId}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Fecha y hora de publicación"
              hint={publishedAt ? `En tu hora local · ${spainTime(publishedAt)} en España` : 'Déjala vacía si todavía no está planificada'}
            >
              <Input type="datetime-local" value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)} style={{ width: '15rem' }} />
            </Field>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Texto del post</span>
                <CopyButton text={form.body} label="Copiar texto" />
              </div>
              <RichTextarea value={form.body} onChange={(v) => set('body', v)} placeholder="El texto tal como irá en la publicación…" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Primer comentario</span>
                <CopyButton text={form.firstComment} label="Copiar comentario" />
              </div>
              <Textarea value={form.firstComment} onChange={(e) => set('firstComment', e.target.value)} placeholder="Los enlaces van aquí, nunca en el texto" className="min-h-20" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Sparkles size={14} className="text-violet-500" /> Prompt de diseño
                </span>
                <CopyButton text={form.designPrompt} label="Copiar prompt" />
              </div>
              <Textarea
                value={form.designPrompt}
                onChange={(e) => set('designPrompt', e.target.value)}
                placeholder="Instrucciones para Claude Design: formato, diapositivas, textos, qué adjuntar…"
                className="min-h-28 font-mono text-xs"
              />
            </div>
            {saveMutation.error ? <ErrorNote error={saveMutation.error} /> : null}
          </div>

          <div className="space-y-5 self-start">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Archivos</p>
              <MediaField value={media} onChange={setMedia} />
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Vista previa</p>
              <SocialPreview
                body={form.body}
                firstComment={form.firstComment}
                media={media}
                format={form.format}
                networks={form.publications.map((p: Publication) => p.network)}
              />
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Dónde se publica</p>
              <p className="mb-3 text-xs text-slate-400">Marca las redes; cuando esté publicado, pega el enlace al post.</p>
              <div className="space-y-2">
                {NETWORKS.map((n) => {
                  const idx = form.publications.findIndex((p: Publication) => p.network === n)
                  const on = idx >= 0
                  return (
                    <div key={n} className={cx('rounded-lg border px-3 py-2', on ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200')}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                        <input type="checkbox" checked={on} onChange={() => toggleNetwork(n)} className="size-4 accent-brand-500" />
                        {NETWORK_LABELS[n]}
                      </label>
                      {on ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Input value={form.publications[idx].url} onChange={(e) => setPub(idx, 'url', e.target.value)} placeholder={`Enlace al post en ${NETWORK_LABELS[n]}`} className="py-1.5 text-xs" />
                          {form.publications[idx].url ? (
                            <a href={form.publications[idx].url} target="_blank" rel="noreferrer" className="shrink-0 text-brand-600 hover:text-brand-700" title="Abrir">
                              <ExternalLink size={15} />
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Eliminar contenido"
        message={`¿Eliminar "${post?.title}"? Se pierde el texto y los archivos dejan de estar asociados.`}
      />
    </>
  )
}

export default function Content() {
  const qc = useQueryClient()
  const [view, setView] = usePersistedState<ViewMode>('walls_content_view', 'calendar')
  const [stored, setFilters] = usePersistedState<Filters>('walls_content_filters', EMPTY_FILTERS)
  const f: Filters = { ...EMPTY_FILTERS, ...stored }
  const setF = (k: keyof Filters, v: string) => setFilters((p) => ({ ...EMPTY_FILTERS, ...p, [k]: v }))
  const [modal, setModal] = useState<{ open: boolean; post?: any; date?: string }>({ open: false })
  const now = new Date()
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const { data: posts, isLoading } = useQuery({
    queryKey: ['content-posts'],
    queryFn: () => rest.listAll('content-posts', { populate: { media: true, publications: true, pillar: true }, sort: 'publishAt:desc' }),
  })
  const { data: pillars } = useQuery({
    queryKey: ['content-pillars'],
    queryFn: () => rest.list('content-pillars', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })
  const pillarList: any[] = pillars || []

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => rest.update('content-posts', id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-posts'] }),
  })

  const filtered = useMemo(() => {
    const q = f.search.toLowerCase()
    return (posts || []).filter((p: any) => {
      if (q && !(p.title || '').toLowerCase().includes(q) && !(p.body || '').toLowerCase().includes(q)) return false
      if (f.status && p.status !== f.status) return false
      if (f.format && p.format !== f.format) return false
      if (f.pillar && p.pillar?.documentId !== f.pillar) return false
      if (f.network && !(p.publications || []).some((x: any) => x.network === f.network)) return false
      return true
    })
  }, [posts, f.search, f.status, f.format, f.pillar, f.network])
  const hasFilters = !!(f.search || f.status || f.format || f.pillar || f.network)

  // ---------- Calendario ----------
  const calendar = useMemo(() => {
    const first = new Date(month.y, month.m, 1)
    const start = new Date(first)
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7)) // lunes
    const days: { key: string; date: Date; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, date: d, inMonth: d.getMonth() === month.m })
    }
    // Se recortan las semanas finales si el mes ya terminó
    while (days.length > 35 && !days.slice(-7).some((d) => d.inMonth)) days.splice(-7)
    return days
  }, [month])
  const byDay = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const p of filtered) {
      const k = localDateKey(p.publishAt)
      if (!k) continue
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    }
    for (const list of map.values()) list.sort((a, b) => String(a.publishAt).localeCompare(String(b.publishAt)))
    return map
  }, [filtered])
  const unscheduled = filtered.filter((p: any) => !p.publishAt && p.status !== 'descartado')
  const todayKey = localDateKey(now.toISOString())

  /** Soltar una pieza en otro día: conserva la hora, cambia la fecha. */
  const dropOnDay = (dayKey: string) => {
    if (!draggingId) return
    const p = (posts || []).find((x: any) => x.documentId === draggingId)
    if (!p) return
    const time = p.publishAt ? localTime(p.publishAt) : '10:00'
    patchMutation.mutate({ id: p.documentId, data: { publishAt: fromLocalInput(`${dayKey}T${time}`) } })
    setDraggingId(null)
    setDragOver(null)
  }

  const cardMedia = (p: any) => (p.media || [])[0]

  const renderMini = (p: any) => (
    <button
      key={p.documentId}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', p.documentId)
        setDraggingId(p.documentId)
      }}
      onDragEnd={() => {
        setDraggingId(null)
        setDragOver(null)
      }}
      onClick={() => setModal({ open: true, post: p })}
      title={`${p.title}${p.publishAt ? ` · ${localTime(p.publishAt)}` : ''}`}
      className={cx(
        'flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-left text-[11px] leading-tight text-slate-700 shadow-sm hover:border-brand-300 hover:shadow',
        draggingId === p.documentId && 'opacity-40',
      )}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: CONTENT_STATUS_DOT[p.status] }} />
      <span className="truncate">{p.title}</span>
      <span className="ml-auto shrink-0 text-slate-400">
        <FormatIcon format={p.format} size={11} />
      </span>
    </button>
  )

  const renderCard = (p: any) => {
    const m = cardMedia(p)
    const kind = m ? mediaKind(m) : null
    return (
      <button
        key={p.documentId}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', p.documentId)
          setDraggingId(p.documentId)
        }}
        onDragEnd={() => {
          setDraggingId(null)
          setDragOver(null)
        }}
        onClick={() => setModal({ open: true, post: p })}
        className={cx(
          'w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md',
          draggingId === p.documentId && 'opacity-40',
        )}
      >
        {m && kind === 'image' ? (
          <img src={m.url} alt="" className="aspect-[5/3] w-full object-cover" />
        ) : m && kind === 'video' ? (
          <div className="flex aspect-[5/3] w-full items-center justify-center bg-slate-900 text-white">
            <Film size={22} />
          </div>
        ) : null}
        <div className="p-3">
          <p className="mb-1.5 text-sm font-medium leading-snug text-slate-900">{p.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {p.format ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <FormatIcon format={p.format} size={11} /> {CONTENT_FORMAT_LABELS[p.format]}
              </span>
            ) : null}
            {p.pillar ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span className="size-1.5 rounded-full" style={{ background: p.pillar.color || '#94a3b8' }} /> {p.pillar.name}
              </span>
            ) : null}
            {(p.publications || []).map((x: any) => (
              <Badge key={x.network} tone={NETWORK_TONES[x.network] || 'gray'}>
                {NETWORK_LABELS[x.network]}
              </Badge>
            ))}
          </div>
          {p.publishAt ? (
            <p className="mt-1.5 text-xs text-slate-400">
              {shortDay(p.publishAt)} · {localTime(p.publishAt)}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-amber-600">Sin fecha</p>
          )}
        </div>
      </button>
    )
  }

  if (isLoading) return <PageLoader />

  const counts = CONTENT_STATUS_ORDER.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: (posts || []).filter((p: any) => p.status === s).length }), {})

  return (
    <div>
      <PageHeader
        title="Contenido"
        subtitle={`${(posts || []).length} publicaciones · ${counts.publicado} publicadas · ${counts.programado} programadas`}
        actions={
          <>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  ['calendar', CalendarDays, 'Calendario'],
                  ['board', LayoutGrid, 'Tablero'],
                  ['list', List, 'Lista'],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={cx('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm', view === key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50')}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <Button icon={Plus} onClick={() => setModal({ open: true })}>
              Nuevo contenido
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-56">
          <SearchInput value={f.search} onChange={(v) => setF('search', v)} placeholder="Buscar contenido…" />
        </div>
        <Select value={f.status} onChange={(e) => setF('status', e.target.value)} className="w-full sm:w-auto" style={{ maxWidth: '100%' }}>
          <option value="">Todos los estados</option>
          {CONTENT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {CONTENT_STATUS_LABELS[s]} ({counts[s]})
            </option>
          ))}
        </Select>
        <Select value={f.format} onChange={(e) => setF('format', e.target.value)} className="w-full sm:w-auto" style={{ maxWidth: '100%' }}>
          <option value="">Todos los formatos</option>
          {Object.entries(CONTENT_FORMAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={f.pillar} onChange={(e) => setF('pillar', e.target.value)} className="w-full sm:w-auto" style={{ maxWidth: '100%' }}>
          <option value="">Todos los pilares</option>
          {pillarList.map((p: any) => (
            <option key={p.documentId} value={p.documentId}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={f.network} onChange={(e) => setF('network', e.target.value)} className="w-full sm:w-auto" style={{ maxWidth: '100%' }}>
          <option value="">Todas las redes</option>
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {NETWORK_LABELS[n]}
            </option>
          ))}
        </Select>
        {hasFilters ? (
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-sm font-medium text-slate-400 hover:text-slate-600">
            Limpiar filtros
          </button>
        ) : null}
        <Link to="/content-pillars" className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <Tags size={15} /> Configurar pilares
        </Link>
      </div>

      {!(posts || []).length ? (
        <EmptyState icon={Megaphone} title="Todavía no hay contenido" description="Crea la primera publicación o planifica el mes en el calendario." />
      ) : view === 'calendar' ? (
        <div className="space-y-3">
          {/* Sin fecha: siempre visible encima del calendario, para arrastrar cada pieza a su día */}
          <div className={cx('rounded-xl border p-3 shadow-sm', unscheduled.length ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white')}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className={cx('text-xs font-semibold uppercase tracking-wide', unscheduled.length ? 'text-amber-700' : 'text-slate-500')}>Sin fecha ({unscheduled.length})</p>
              {unscheduled.length ? (
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {unscheduled.map((p: any) => (
                    <div key={p.documentId} className="w-56">
                      {renderMini(p)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Todo lo pendiente tiene fecha.</p>
              )}
              {unscheduled.length ? <p className="w-full text-[11px] text-amber-700/70">Arrástralas a un día del calendario para planificarlas, o haz clic para ponerles fecha.</p> : null}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={() => setMonth((x) => (x.m === 0 ? { y: x.y - 1, m: 11 } : { y: x.y, m: x.m - 1 }))} className="rounded-md p-1.5 hover:bg-slate-100">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setMonth((x) => (x.m === 11 ? { y: x.y + 1, m: 0 } : { y: x.y, m: x.m + 1 }))} className="rounded-md p-1.5 hover:bg-slate-100">
                  <ChevronRight size={16} />
                </button>
                <h2 className="ml-1 text-sm font-semibold text-slate-900">{monthTitle(month.y, month.m)}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {CONTENT_STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => setF('status', f.status === s ? '' : s)}
                    title={`Ver solo ${CONTENT_STATUS_LABELS[s].toLowerCase()}`}
                    className={cx('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]', f.status === s ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
                  >
                    <span className="size-2 rounded-full" style={{ background: CONTENT_STATUS_DOT[s] }} />
                    {CONTENT_STATUS_LABELS[s]} <span className="text-slate-400">{counts[s]}</span>
                  </button>
                ))}
                <button onClick={() => setMonth({ y: now.getFullYear(), m: now.getMonth() })} className="ml-2 text-xs font-medium text-brand-600 hover:text-brand-700">
                  Hoy
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="bg-slate-50 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {d}
                </div>
              ))}
              {calendar.map((d) => {
                const list = byDay.get(d.key) || []
                const isToday = d.key === todayKey
                return (
                  <div
                    key={d.key}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(d.key)
                    }}
                    onDragLeave={() => setDragOver((k) => (k === d.key ? null : k))}
                    onDrop={(e) => {
                      e.preventDefault()
                      dropOnDay(d.key)
                    }}
                    onDoubleClick={() => setModal({ open: true, date: d.key })}
                    className={cx(
                      'min-h-[104px] bg-white p-1.5 transition-colors',
                      !d.inMonth && 'bg-slate-50/70',
                      dragOver === d.key && 'bg-brand-50 ring-2 ring-inset ring-brand-300',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className={cx('text-xs', isToday ? 'rounded-full bg-brand-600 px-1.5 py-0.5 font-semibold text-white' : d.inMonth ? 'text-slate-600' : 'text-slate-300')}>
                        {d.date.getDate()}
                      </span>
                      <button
                        onClick={() => setModal({ open: true, date: d.key })}
                        title="Nuevo contenido este día"
                        className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="space-y-1">{list.map(renderMini)}</div>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Arrastra una publicación a otro día para reprogramarla · doble clic en un día para crear · el punto de color es el estado</p>
          </div>
        </div>
      ) : view === 'board' ? (
        <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${CONTENT_STATUS_ORDER.length}, minmax(200px, 1fr))` }}>
          {CONTENT_STATUS_ORDER.map((s) => {
            const list = filtered.filter((p: any) => p.status === s)
            return (
              <div
                key={s}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(s)
                }}
                onDragLeave={() => setDragOver((k) => (k === s ? null : k))}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggingId) patchMutation.mutate({ id: draggingId, data: { status: s } })
                  setDraggingId(null)
                  setDragOver(null)
                }}
                className={cx('flex min-h-[300px] flex-col rounded-xl bg-slate-100 p-2', dragOver === s && 'ring-2 ring-brand-300')}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className="size-2 rounded-full" style={{ background: CONTENT_STATUS_DOT[s] }} />
                    {CONTENT_STATUS_LABELS[s]}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{list.length}</span>
                </div>
                <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-0.5">
                  {list.map(renderCard)}
                  {!list.length ? <p className="py-6 text-center text-xs text-slate-400">Vacío</p> : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Publicación</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Formato</th>
                <th className="px-4 py-2.5">Pilar</th>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Redes</th>
                <th className="px-4 py-2.5">Archivos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...filtered]
                .sort((a: any, b: any) => String(b.publishAt || '').localeCompare(String(a.publishAt || '')))
                .map((p: any) => (
                  <tr key={p.documentId} onClick={() => setModal({ open: true, post: p })} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{p.title}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={CONTENT_STATUS_TONES[p.status]}>{CONTENT_STATUS_LABELS[p.status]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{p.format ? CONTENT_FORMAT_LABELS[p.format] : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.pillar?.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{p.publishAt ? `${shortDay(p.publishAt)} · ${localTime(p.publishAt)}` : <span className="text-amber-600">Sin fecha</span>}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {(p.publications || []).map((x: any) =>
                          x.url ? (
                            <a key={x.network} href={x.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Abrir post">
                              <Badge tone={NETWORK_TONES[x.network]}>{NETWORK_LABELS[x.network]} ↗</Badge>
                            </a>
                          ) : (
                            <Badge key={x.network} tone={NETWORK_TONES[x.network]}>
                              {NETWORK_LABELS[x.network]}
                            </Badge>
                          ),
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{(p.media || []).length || '—'}</td>
                  </tr>
                ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Nada coincide con los filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {patchMutation.error ? (
        <div className="mt-3">
          <ErrorNote error={patchMutation.error} />
        </div>
      ) : null}

      <ContentModal open={modal.open} onClose={() => setModal({ open: false })} post={modal.post} initialDate={modal.date} pillars={pillarList} />
    </div>
  )
}
