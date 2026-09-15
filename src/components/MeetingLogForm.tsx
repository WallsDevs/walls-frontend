import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { api } from '../lib/api'
import { todayISO } from '../lib/format'
import { Button, ErrorNote, Field, Input, Textarea } from './ui'

type Participant = { documentId: string; name: string }

/**
 * Registrar una reunión: una sola vez para varios participantes.
 * `endpoint` es la ruta que crea las entradas (admin: /tasks/:id/meeting · portal: /me/tasks/:id/meeting).
 * Cada participante recibe su propio registro de horas, así que se facturan igual que cualquier otra hora.
 */
export default function MeetingLogForm({
  endpoint,
  participants,
  onSaved,
  invalidateKeys = [],
  compact = false,
}: {
  endpoint: string
  participants: Participant[]
  onSaved?: () => void
  invalidateKeys?: string[][]
  compact?: boolean
}) {
  const qc = useQueryClient()
  const [date, setDate] = useState(todayISO())
  const [hrs, setHrs] = useState('1')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>(participants.map((p) => p.documentId))

  useEffect(() => {
    setSelected(participants.map((p) => p.documentId))
  }, [participants.map((p) => p.documentId).join(',')])

  const mutation = useMutation({
    mutationFn: () =>
      api(endpoint, {
        method: 'POST',
        body: { date, hours: Number(hrs), description: description || undefined, participants: selected },
      }),
    onSuccess: () => {
      for (const k of invalidateKeys) qc.invalidateQueries({ queryKey: k })
      setDescription('')
      onSaved?.()
    },
  })

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const total = Number(hrs || 0) * selected.length

  return (
    <div className="space-y-3">
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_2fr]'}>
        <Field label="Fecha">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Duración (h)">
          <Input type="number" min={0.25} max={24} step={0.25} value={hrs} onChange={(e) => setHrs(e.target.value)} />
        </Field>
        {!compact ? (
          <Field label="Tema / notas">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Daily, revisión de sprint…" />
          </Field>
        ) : null}
      </div>
      {compact ? (
        <Field label="Tema / notas">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Daily, revisión de sprint…" className="min-h-16" />
        </Field>
      ) : null}
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Participantes</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {participants.map((p) => (
            <label key={p.documentId} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={selected.includes(p.documentId)} onChange={() => toggle(p.documentId)} className="size-4 accent-brand-500" />
              {p.name}
            </label>
          ))}
          {!participants.length ? <span className="text-xs text-slate-400">Asigna developers a la tarea para poder registrar la reunión.</span> : null}
        </div>
        <p className="mt-1 text-xs text-slate-400">Cada uno recibe sus propias horas, y se facturan como cualquier otra.</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Users size={13} />
          {selected.length} {selected.length === 1 ? 'persona' : 'personas'} × {hrs || 0} h = <strong className="text-slate-700">{total} h</strong> en total
        </span>
        <Button size="sm" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!selected.length || !Number(hrs) || !date}>
          Registrar reunión
        </Button>
      </div>
      {mutation.error ? <ErrorNote error={mutation.error} /> : null}
    </div>
  )
}
