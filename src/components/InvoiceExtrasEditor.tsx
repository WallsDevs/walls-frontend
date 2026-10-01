import { Plus, Trash2 } from 'lucide-react'
import { money } from '../lib/format'
import { Button, Field, Input, Select } from './ui'

export type ExtraLine = { kind: 'hours' | 'fixed'; description: string; quantity: string; rate: string }
export type TaxLine = { label: string; rate: string }
export type InvoiceExtras = { lines: ExtraLine[]; taxes: TaxLine[]; feeAmount: string; feeLabel: string }

export const emptyExtraLine = (kind: 'hours' | 'fixed' = 'fixed'): ExtraLine => ({ kind, description: '', quantity: '1', rate: '' })
export const emptyExtras = (): InvoiceExtras => ({ lines: [], taxes: [], feeAmount: '0', feeLabel: 'Comisión de envío / cambio' })
export const emptyTax = (): TaxLine => ({ label: 'IVA', rate: '' })
export const extraLineAmount = (l: ExtraLine) => (Number(l.quantity) || 0) * (Number(l.rate) || 0)

/** Convierte el estado del editor al formato que guarda el servidor. */
export const extrasToPayload = (x: InvoiceExtras) => ({
  extraLines: x.lines.filter((l) => l.description.trim() || extraLineAmount(l)).map((l) => ({ kind: l.kind, description: l.description.trim(), quantity: Number(l.quantity) || 1, rate: Number(l.rate) || 0 })),
  taxes: x.taxes.filter((t) => Number(t.rate) > 0).map((t) => ({ label: t.label.trim() || 'Impuesto', rate: Number(t.rate) })),
  feeAmount: Number(x.feeAmount) || 0,
  feeLabel: x.feeLabel.trim() || 'Comisión de envío / cambio',
})

/** Totales en vivo: subtotal base (líneas generadas) + ítems adicionales, impuesto y comisión. */
export function extrasTotals(baseSubtotal: number, x: InvoiceExtras) {
  const extras = x.lines.reduce((s, l) => s + extraLineAmount(l), 0)
  const subtotal = baseSubtotal + extras
  const taxes = x.taxes.map((t) => ({ label: t.label || 'Impuesto', rate: Number(t.rate) || 0, amount: subtotal * ((Number(t.rate) || 0) / 100) }))
  const taxAmount = taxes.reduce((s, t) => s + t.amount, 0)
  const feeAmount = Number(x.feeAmount) || 0
  return { extras, subtotal, taxes, taxAmount, feeAmount, total: subtotal + taxAmount + feeAmount }
}

/**
 * Editor de ítems adicionales (horas o costo fijo), impuesto y comisión, con el desglose calculado.
 * Se usa al generar la factura y al editarla después.
 */
export default function InvoiceExtrasEditor({
  value,
  onChange,
  baseSubtotal,
  currency = 'USD',
}: {
  value: InvoiceExtras
  onChange: (next: InvoiceExtras) => void
  baseSubtotal: number
  currency?: string
}) {
  const t = extrasTotals(baseSubtotal, value)
  const setLine = (i: number, patch: Partial<ExtraLine>) => onChange({ ...value, lines: value.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Ítems adicionales</h3>
          <p className="text-xs text-slate-400">Horas o servicios que no están registrados en el proyecto.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange({ ...value, lines: [...value.lines, emptyExtraLine('hours')] })}>
            Horas
          </Button>
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange({ ...value, lines: [...value.lines, emptyExtraLine('fixed')] })}>
            Costo fijo
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {value.lines.map((l, i) => (
          <div key={i} className="grid items-center gap-2 sm:grid-cols-[110px_1fr_90px_120px_100px_auto]">
            <Select value={l.kind} onChange={(e) => setLine(i, { kind: e.target.value as ExtraLine['kind'], quantity: e.target.value === 'fixed' ? '1' : l.quantity })} className="py-1.5 text-xs">
              <option value="hours">Horas</option>
              <option value="fixed">Costo fijo</option>
            </Select>
            <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder={l.kind === 'hours' ? 'Ej. Soporte fuera de horario' : 'Ej. Dominio y hosting anual'} />
            <Input type="number" min={0} step={l.kind === 'hours' ? '0.5' : '1'} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} placeholder={l.kind === 'hours' ? 'Horas' : 'Cant.'} title={l.kind === 'hours' ? 'Horas' : 'Cantidad'} />
            <Input type="number" min={0} step="0.01" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} placeholder={l.kind === 'hours' ? '$/hora' : 'Precio'} title={l.kind === 'hours' ? 'Tarifa por hora' : 'Precio unitario'} />
            <span className="text-right text-sm font-medium text-slate-700">{money(extraLineAmount(l), currency)}</span>
            <button onClick={() => onChange({ ...value, lines: value.lines.filter((_, j) => j !== i) })} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Quitar">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!value.lines.length ? <p className="text-xs text-slate-400">Sin ítems adicionales.</p> : null}
      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Impuestos (% sobre el subtotal)</span>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange({ ...value, taxes: [...value.taxes, emptyTax()] })}>
                Impuesto
              </Button>
            </div>
            <div className="space-y-2">
              {value.taxes.map((tx, i) => (
                <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_90px_110px_auto]">
                  <Input value={tx.label} onChange={(e) => onChange({ ...value, taxes: value.taxes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Nombre (IVA, retención…)" />
                  <Input type="number" min={0} step="0.1" value={tx.rate} onChange={(e) => onChange({ ...value, taxes: value.taxes.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)) })} placeholder="%" />
                  <span className="text-right text-sm font-medium text-slate-700">{money(t.taxes[i]?.amount || 0, currency)}</span>
                  <button onClick={() => onChange({ ...value, taxes: value.taxes.filter((_, j) => j !== i) })} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Quitar">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {!value.taxes.length ? <p className="text-xs text-slate-400">Sin impuestos.</p> : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Field label="Nombre de la comisión">
              <Input value={value.feeLabel} onChange={(e) => onChange({ ...value, feeLabel: e.target.value })} placeholder="Comisión de envío / cambio" />
            </Field>
            <Field label="Comisión (monto)" hint="Lo que cobra el intermediario">
              <Input type="number" min={0} step="0.01" value={value.feeAmount} onChange={(e) => onChange({ ...value, feeAmount: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <div className="flex justify-between py-0.5 text-slate-600">
            <span>Líneas del proyecto</span>
            <span>{money(baseSubtotal, currency)}</span>
          </div>
          {t.extras > 0 ? (
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Ítems adicionales</span>
              <span>{money(t.extras, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-200 py-0.5 pt-1.5 text-slate-700">
            <span>Subtotal</span>
            <span>{money(t.subtotal, currency)}</span>
          </div>
          {t.taxes
            .filter((tx) => tx.rate > 0)
            .map((tx, i) => (
              <div key={i} className="flex justify-between py-0.5 text-slate-600">
                <span>
                  {tx.label} ({tx.rate}%)
                </span>
                <span>{money(tx.amount, currency)}</span>
              </div>
            ))}
          {t.feeAmount > 0 ? (
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>{value.feeLabel || 'Comisión'}</span>
              <span>{money(t.feeAmount, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-slate-900 py-1 pt-1.5 font-semibold text-slate-900">
            <span>Total</span>
            <span>{money(t.total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
