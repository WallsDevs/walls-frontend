import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { rest } from '../../lib/api'
import { Button, ConfirmDialog, EditableText, ErrorNote, Field, Input, Modal, PageLoader } from '../../components/ui'

const emptyForm = () => ({ name: '', color: '#2a78d6' })

function PillarModal({ open, onClose, nextPosition }: { open: boolean; onClose: () => void; nextPosition: number }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(emptyForm())

  useEffect(() => {
    if (open) setForm(emptyForm())
  }, [open])

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => rest.create('content-pillars', { ...form, position: nextPosition }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-pillars'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo pilar"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.name.trim()}>
            Crear pilar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Cultura de equipo" autoFocus />
        </Field>
        <Field label="Color">
          <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

/** Pilares o temas del contenido: lista editable, igual que los orígenes de leads. */
export default function ContentPillars() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)

  const { data: pillars, isLoading } = useQuery({
    queryKey: ['content-pillars'],
    queryFn: () => rest.list('content-pillars', { sort: 'position:asc', pagination: { pageSize: 100 }, populate: { posts: { fields: ['id'] } } }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => rest.update('content-pillars', id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-pillars'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => rest.remove('content-pillars', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-pillars'] })
      qc.invalidateQueries({ queryKey: ['content-posts'] })
      setDeleting(null)
    },
  })

  if (isLoading) return <PageLoader />

  const list = pillars || []

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= list.length) return
    updateMutation.mutate({ id: list[i].documentId, data: { position: list[j].position } })
    updateMutation.mutate({ id: list[j].documentId, data: { position: list[i].position } })
  }

  return (
    <div>
      <Link to="/content" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Contenido
      </Link>

      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Configurar pilares</h1>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Nuevo pilar
        </Button>
      </div>
      <p className="mb-5 text-sm text-slate-500">Los temas sobre los que publicas. Renómbralos, reordénalos, agrega los que te falten o borra los que no uses.</p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.map((p: any, i: number) => (
          <div key={p.documentId} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
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
              value={p.color || '#94a3b8'}
              onChange={(e) => updateMutation.mutate({ id: p.documentId, data: { color: e.target.value } })}
              className="size-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Color del pilar"
            />
            <EditableText
              value={p.name}
              onSave={(name) => name.trim() && updateMutation.mutate({ id: p.documentId, data: { name: name.trim() } })}
              className="flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:outline-none"
            />
            <span className="shrink-0 text-xs text-slate-400">{(p.posts || []).length} publicaciones</span>
            <button onClick={() => setDeleting(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!list.length ? <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no hay pilares.</p> : null}
      </div>
      {removeMutation.error ? (
        <div className="mt-3">
          <ErrorNote error={removeMutation.error} />
        </div>
      ) : null}

      <PillarModal open={modalOpen} onClose={() => setModalOpen(false)} nextPosition={(list[list.length - 1]?.position || 0) + 1} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeMutation.mutate(deleting.documentId)}
        loading={removeMutation.isPending}
        title="Eliminar pilar"
        message={`¿Eliminar "${deleting?.name}"? Las publicaciones con este pilar se quedarán sin pilar.`}
      />
    </div>
  )
}
