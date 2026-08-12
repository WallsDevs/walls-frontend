import { Plus, Trash2 } from 'lucide-react'
import { PAYMENT_TYPE_LABELS } from '../lib/labels'
import { Button, Input, Select } from './ui'

export type PaymentMethod = { type: string; accountName: string; details: string; preferred: boolean }

export default function PaymentMethodsEditor({
  methods,
  onChange,
}: {
  methods: PaymentMethod[]
  onChange: (methods: PaymentMethod[]) => void
}) {
  const setMethod = (i: number, k: keyof PaymentMethod, v: unknown) =>
    onChange(methods.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)))

  const markPreferred = (i: number) => onChange(methods.map((m, idx) => ({ ...m, preferred: idx === i })))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">Métodos de pago</span>
        <Button
          size="sm"
          variant="secondary"
          icon={Plus}
          onClick={() =>
            onChange([...methods, { type: 'binance', accountName: '', details: '', preferred: methods.length === 0 }])
          }
        >
          Agregar
        </Button>
      </div>
      <div className="space-y-2">
        {methods.map((m, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 sm:grid-cols-[130px_1fr_auto]">
              <Select value={m.type} onChange={(e) => setMethod(i, 'type', e.target.value)}>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Input
                value={m.accountName}
                onChange={(e) => setMethod(i, 'accountName', e.target.value)}
                placeholder="Titular de la cuenta"
              />
              <div className="flex items-center gap-1">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100">
                  <input type="radio" checked={m.preferred} onChange={() => markPreferred(i)} className="accent-brand-500" />
                  Preferido
                </label>
                <button
                  type="button"
                  onClick={() => onChange(methods.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <Input
              className="mt-2"
              value={m.details}
              onChange={(e) => setMethod(i, 'details', e.target.value)}
              placeholder={
                m.type === 'binance'
                  ? 'Binance Pay ID / correo'
                  : m.type === 'bancolombia'
                    ? 'Tipo y número de cuenta'
                    : 'Detalles del pago'
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}
