import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import { Button, ConfirmDialog, EditableText, ErrorNote, Field, Input, Modal, PageLoader } from '../../components/ui'

const emptyForm = () => ({ name: '', color: '#2a78d6' })

function SourceModal({ open, onClose, nextPosition }: { open: boolean; onClose: () => void; nextPosition: number }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm())

  useEffect(() => {
    if (open) setForm(emptyForm())
  }, [open])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => rest.create('lead-sources', { ...form, position: nextPosition }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-sources'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo origen"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.name}>
            Crear origen
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Vacante publicada" />
        </Field>
        <Field label="Color">
          <input
            type="color"
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
            className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
          />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

export default function LeadSources() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)

  const { data: sources, isLoading } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => rest.list('lead-sources', { sort: 'position:asc', pagination: { pageSize: 100 } }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => rest.update('lead-sources', id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-sources'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => rest.remove('lead-sources', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-sources'] })
      setDeleting(null)
    },
  })

  if (isLoading) return <PageLoader />

  const list = sources || []

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
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Configurar orígenes</h1>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Nuevo origen
        </Button>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        De dónde salen tus leads: renómbralos, reordénalos, agrega los que te falten o borra los que no uses.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.map((s: any, i: number) => (
          <div key={s.documentId} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
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
              title="Color del origen"
            />
            <EditableText
              value={s.name}
              onSave={(name) => name.trim() && updateMutation.mutate({ id: s.documentId, data: { name: name.trim() } })}
              className="flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:outline-none"
            />
            <button onClick={() => setDeleting(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!list.length ? <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay orígenes.</p> : null}
      </div>

      <SourceModal open={modalOpen} onClose={() => setModalOpen(false)} nextPosition={(list[list.length - 1]?.position || 0) + 1} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeMutation.mutate(deleting.documentId)}
        loading={removeMutation.isPending}
        title="Eliminar origen"
        message={`¿Eliminar "${deleting?.name}"? Los leads con este origen se quedarán sin origen asignado.`}
      />
    </div>
  )
}
