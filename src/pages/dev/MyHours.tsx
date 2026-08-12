import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, Pencil, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, hours, monthStartISO } from '../../lib/format'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  TableWrap,
  Td,
  Textarea,
  Th,
} from '../../components/ui'

function EditEntryModal({ entry, onClose }: { entry: any | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(entry?.date || '')
  const [hrs, setHrs] = useState(String(entry?.hours ?? ''))
  const [description, setDescription] = useState(entry?.description || '')

  const mutation = useMutation({
    mutationFn: () =>
      api(`/me/time-entries/${entry.documentId}`, {
        method: 'PUT',
        body: { date, hours: Number(hrs), description },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-entries'] })
      qc.invalidateQueries({ queryKey: ['me-tasks'] })
      onClose()
    },
  })

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      title="Editar registro"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!hrs || Number(hrs) <= 0}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horas">
            <Input type="number" min={0.5} max={24} step={0.5} value={hrs} onChange={(e) => setHrs(e.target.value)} />
          </Field>
        </div>
        <Field label="Descripción">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}

export default function MyHours() {
  const qc = useQueryClient()
  const [month, setMonth] = useState(monthStartISO().slice(0, 7))
  const [editing, setEditing] = useState<any | null>(null)

  const from = month ? `${month}-01` : ''
  const to = month
    ? (() => {
        const [y, m] = month.split('-').map(Number)
        const last = new Date(y, m, 0).getDate()
        return `${month}-${String(last).padStart(2, '0')}`
      })()
    : ''

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['me-entries', month],
    queryFn: () => api(`/me/time-entries${month ? `?from=${from}&to=${to}` : ''}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/me/time-entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-entries'] })
      qc.invalidateQueries({ queryKey: ['me-tasks'] })
    },
  })

  const totals = useMemo(() => {
    const list = entries || []
    const total = list.reduce((s: number, e: any) => s + Number(e.hours || 0), 0)
    const byProject: Record<string, number> = {}
    for (const e of list) {
      const name = e.project?.name || 'Sin proyecto'
      byProject[name] = (byProject[name] || 0) + Number(e.hours || 0)
    }
    return { total, byProject: Object.entries(byProject).sort((a, b) => b[1] - a[1]) }
  }, [entries])

  if (isLoading) return <PageLoader />
  if (error) return <ErrorNote error={error} />

  return (
    <div>
      <PageHeader
        title="Mis horas"
        subtitle="Historial de horas registradas"
        actions={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Card className="px-4 py-2.5">
          <span className="text-xs text-slate-500">Total del período: </span>
          <span className="font-semibold text-slate-900">{hours(totals.total)}</span>
        </Card>
        {totals.byProject.map(([name, h]) => (
          <span key={name} className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200">
            {name}: <span className="font-semibold">{hours(h)}</span>
          </span>
        ))}
      </div>

      {!(entries || []).length ? (
        <EmptyState icon={Clock3} title="Sin horas este mes" description="Registra horas desde Mis tareas." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Proyecto</Th>
              <Th>Tarea</Th>
              <Th>Descripción</Th>
              <Th right>Horas</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {(entries || []).map((e: any) => (
              <tr key={e.documentId} className="hover:bg-slate-50">
                <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
                <Td>{e.project?.name || '—'}</Td>
                <Td>{e.task?.title || '—'}</Td>
                <Td className="max-w-56 truncate text-slate-500">{e.description || '—'}</Td>
                <Td right className="font-medium">{hours(e.hours)}</Td>
                <Td>{e.billed ? <Badge tone="green">Facturada</Badge> : <Badge tone="gray">Sin facturar</Badge>}</Td>
                <Td>
                  {!e.billed ? (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(e)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(e.documentId)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {editing ? <EditEntryModal entry={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
