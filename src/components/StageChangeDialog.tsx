import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rest } from '../lib/api'
import { todayISO } from '../lib/format'
import { stageChangeRequirements, type StageNeed } from '../lib/leadRules'
import { Button, ErrorNote, Field, Input, Modal, Textarea } from './ui'

type Pending = { lead: any; target: any; needs: StageNeed[] }

/**
 * Mover un lead de etapa con las reglas del proceso: bloquea (puntaje), pide lo que falte
 * (motivo de cierre, fecha del próximo paso) o mueve directo. Lo usan el tablero y el detalle.
 */
export function useStageChange({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient()
  const [pending, setPending] = useState<Pending | null>(null)
  const [form, setForm] = useState<Record<StageNeed, string>>({ closeReason: '', nextFollowUpDate: '' })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: any }) => rest.update('leads', leadId, data),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead', vars.leadId] })
      setPending(null)
      setError(null)
      onSuccess?.()
    },
    onError: (e: any) => setError(e?.message || 'No se pudo mover el lead'),
  })

  const request = (lead: any, target: any) => {
    if (!lead || !target || lead.stage?.documentId === target.documentId) return
    setError(null)
    const { blocked, needs } = stageChangeRequirements(lead, target)
    if (blocked) {
      setError(blocked)
      return
    }
    if (needs.length) {
      setForm({ closeReason: '', nextFollowUpDate: todayISO() })
      setPending({ lead, target, needs })
      return
    }
    mutation.mutate({ leadId: lead.documentId, data: { stage: target.documentId } })
  }

  const confirm = () => {
    if (!pending) return
    const data: any = { stage: pending.target.documentId }
    for (const need of pending.needs) data[need] = form[need]
    mutation.mutate({ leadId: pending.lead.documentId, data })
  }

  const cancel = () => {
    setPending(null)
    setError(null)
  }

  const canConfirm = !!pending && pending.needs.every((n) => !!form[n])

  const dialog = (
    <Modal
      open={!!pending}
      onClose={cancel}
      title={pending ? `Mover a ${pending.target.name}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={cancel}>
            Cancelar
          </Button>
          <Button onClick={confirm} loading={mutation.isPending} disabled={!canConfirm}>
            Mover
          </Button>
        </>
      }
    >
      {pending ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Para mover <span className="font-medium text-slate-900">{pending.lead.companyName}</span> a{' '}
            <span className="font-medium text-slate-900">{pending.target.name}</span> falta:
          </p>
          {pending.needs.includes('closeReason') ? (
            <Field label="Motivo de cierre *" hint="Escríbelo con tus palabras: queda en el lead para saber después por qué se perdió">
              <Textarea
                value={form.closeReason}
                onChange={(e) => setForm((f) => ({ ...f, closeReason: e.target.value }))}
                placeholder="Ej: ya trabajan con otra agencia y no van a cambiar este año"
                className="min-h-20"
                autoFocus
              />
            </Field>
          ) : null}
          {pending.needs.includes('nextFollowUpDate') ? (
            <Field label="Próximo paso *" hint="Cuándo vuelves a tocar este lead">
              <Input type="date" value={form.nextFollowUpDate} onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))} />
            </Field>
          ) : null}
          {error ? <ErrorNote error={new Error(error)} /> : null}
        </div>
      ) : null}
    </Modal>
  )

  return { request, dialog, dialogOpen: !!pending, error, clearError: () => setError(null), isPending: mutation.isPending }
}
