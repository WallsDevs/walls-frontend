import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import { PIPELINE_OUTCOME_LABELS, PIPELINE_OUTCOME_TONES } from '../../lib/labels'
import { stageTracksNextStep } from '../../lib/leadRules'
import {
  Badge,
  Button,
  ConfirmDialog,
  EditableText,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageLoader,
  Select,
} from '../../components/ui'

const emptyForm = () => ({ name: '', color: '#2a78d6', outcome: 'open' })

function StageModal({ open, onClose, nextPosition }: { open: boolean; onClose: () => void; nextPosition: number }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm())

  useEffect(() => {
    if (open) setForm(emptyForm())
  }, [open])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => rest.create('pipeline-stages', { ...form, position: nextPosition }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva etapa"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.name}>
            Crear etapa
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Demo agendada" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color">
            <input
              type="color"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            />
          </Field>
          <Field label="Resultado">
            <Select value={form.outcome} onChange={(e) => set('outcome', e.target.value)}>
              {Object.entries(PIPELINE_OUTCOME_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

export default function PipelineStages() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)

  const { data: stages, isLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => rest.list('pipeline-stages', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => rest.update('pipeline-stages', id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => rest.remove('pipeline-stages', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] })
      setDeleting(null)
    },
  })

  if (isLoading) return <PageLoader />

  const list = stages || []

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= list.length) return
    updateMutation.mutate({ id: list[i].documentId, data: { position: list[j].position } })
    updateMutation.mutate({ id: list[j].documentId, data: { position: list[i].position } })
  }

  return (
    <div>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Leads
      </Link>

      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Configurar etapas</h1>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Nueva etapa
        </Button>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        Las seis etapas del proceso comercial vienen por defecto (de "Por revisar" a "Ganado" / "Cerrado sin venta") y
        puedes renombrarlas, reordenarlas o agregar otras. "Por revisar" no se puede borrar: es donde entra todo lead
        nuevo y adonde vuelven los leads de una etapa que elimines. Las etapas marcadas "Ganada" habilitan "Convertir a
        cliente".
      </p>

      {removeMutation.error ? (
        <div className="mb-3">
          <ErrorNote error={removeMutation.error} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.map((s: any, i: number) => (
          <div key={s.documentId} title={s.description || undefined} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
            <div className="flex flex-col gap-0.5 text-slate-400">
              <button onClick={() => swap(i, i - 1)} disabled={i === 0} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30">
                <ArrowUp size={13} />
              </button>
              <button onClick={() => swap(i, i + 1)} disabled={i === list.length - 1} className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30">
                <ArrowDown size={13} />
              </button>
            </div>
            <input
              type="color"
              value={s.color || '#94a3b8'}
              onChange={(e) => updateMutation.mutate({ id: s.documentId, data: { color: e.target.value } })}
              className="size-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Color de la etapa"
            />
            <div className="min-w-0 flex-1">
              <EditableText
                value={s.name}
                onSave={(name) => name.trim() && updateMutation.mutate({ id: s.documentId, data: { name: name.trim() } })}
                className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:outline-none"
              />
              <EditableText
                value={s.description || ''}
                onSave={(description) => updateMutation.mutate({ id: s.documentId, data: { description: description.trim() || null } })}
                placeholder="Descripción (se muestra como ayuda)"
                className="w-full rounded-lg border border-transparent px-2 py-0.5 text-xs text-slate-500 placeholder:text-slate-300 hover:border-slate-200 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <Select
              value={s.outcome}
              onChange={(e) => updateMutation.mutate({ id: s.documentId, data: { outcome: e.target.value } })}
              className="shrink-0 py-1 text-xs"
              style={{ width: '8.5rem' }}
            >
              {Object.entries(PIPELINE_OUTCOME_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Badge tone={PIPELINE_OUTCOME_TONES[s.outcome]}>{PIPELINE_OUTCOME_LABELS[s.outcome]}</Badge>
            <label
              className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-600"
              title="Si está activo, los leads en esta etapa deben tener fecha de próximo paso y se marcan como vencidos al pasarse. Desactívalo en etapas de espera o descarte."
            >
              <input
                type="checkbox"
                checked={stageTracksNextStep(s)}
                onChange={(e) => updateMutation.mutate({ id: s.documentId, data: { tracksNextStep: e.target.checked } })}
                className="size-4 accent-brand-500"
              />
              Vence
            </label>
            {s.slug === 'por_revisar' ? (
              <span title="Punto de entrada: no se puede eliminar" className="shrink-0">
                <Badge tone="blue">Entrada</Badge>
              </span>
            ) : (
              <button onClick={() => setDeleting(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {!list.length ? <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay etapas.</p> : null}
      </div>

      <StageModal open={modalOpen} onClose={() => setModalOpen(false)} nextPosition={(list[list.length - 1]?.position || 0) + 1} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeMutation.mutate(deleting.documentId)}
        loading={removeMutation.isPending}
        title="Eliminar etapa"
        message={`¿Eliminar "${deleting?.name}"? Sus leads pasarán a "Por revisar".`}
      />
    </div>
  )
}
