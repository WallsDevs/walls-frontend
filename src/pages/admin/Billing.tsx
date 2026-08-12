import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Briefcase, CheckCircle2, Eye, FileText, Receipt, Wallet } from 'lucide-react'
import { api, rest } from '../../lib/api'
import { fmtDate, hours, money, monthEndISO, monthLabel, monthStartISO, todayISO } from '../../lib/format'
import { BILLING_TYPE_LABELS, INVOICE_STATUS_LABELS, PAYMENT_TYPE_LABELS, REPORT_STATUS_LABELS } from '../../lib/labels'
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
  Select,
  Spinner,
  TableWrap,
  Tabs,
  Td,
  Th,
  INVOICE_STATUS_TONES,
} from '../../components/ui'

function UnbilledTab() {
  const qc = useQueryClient()
  const [project, setProject] = useState('')
  const [periodStart, setPeriodStart] = useState(monthStartISO())
  const [periodEnd, setPeriodEnd] = useState(monthEndISO())
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<any | null>(null)

  const { data: projects } = useQuery({
    queryKey: ['projects-min'],
    queryFn: () => rest.list('projects', { sort: 'name:asc', pagination: { pageSize: 100 } }),
  })

  const { data: preview, isFetching, error } = useQuery({
    queryKey: ['unbilled', project, periodStart, periodEnd],
    queryFn: () => api(`/billing/unbilled?project=${project}&periodStart=${periodStart}&periodEnd=${periodEnd}`),
    enabled: !!project,
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      api('/billing/generate', {
        method: 'POST',
        body: { project, periodStart, periodEnd, notes: notes || undefined },
      }),
    onSuccess: (res) => {
      setResult(res)
      setNotes('')
      qc.invalidateQueries({ queryKey: ['unbilled'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['project-entries'] })
    },
  })

  const billableRows = (preview?.rows || []).filter((r: any) =>
    r.billingType === 'fixed' ? !r.alreadyBilled : r.hours > 0,
  )

  return (
    <div>
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
          <Field label="Proyecto">
            <Select
              value={project}
              onChange={(e) => {
                setProject(e.target.value)
                setResult(null)
              }}
            >
              <option value="">Selecciona un proyecto…</option>
              {(projects || []).map((p: any) => (
                <option key={p.documentId} value={p.documentId}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Inicio del período">
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </Field>
          <Field label="Fin del período">
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </Field>
        </div>
      </Card>

      {result ? (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={20} />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-emerald-800">
                Se generó la factura {result.invoice.number} y el reporte de pago {result.paymentReport.number}
              </p>
              <p className="text-emerald-700">
                {result.billedEntries} registros de horas marcados como facturados.
                {result.skipped?.length ? ` ${result.skipped.length} devs sin asignación quedaron fuera.` : ''}
              </p>
            </div>
            <Link to={`/billing/invoices/${result.invoice.documentId}`}>
              <Button size="sm" variant="secondary" icon={Eye}>
                Ver factura
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {!project ? (
        <EmptyState
          icon={Receipt}
          title="Escoge un proyecto"
          description="Verás las horas sin facturar de cada developer con su esquema de pago, y podrás generar la factura y el reporte de pago en un solo paso."
        />
      ) : isFetching && !preview ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorNote error={error} />
      ) : preview ? (
        <>
          {preview.existingInvoices?.length ? (
            <Card className="mb-4 border-brand-200 bg-brand-50 p-4">
              <div className="flex gap-2.5 text-sm text-brand-800">
                <FileText size={18} className="shrink-0" />
                <div>
                  <p className="font-semibold">
                    Este período ya fue facturado:{' '}
                    {preview.existingInvoices
                      .map((i: any) => `${i.number} (${INVOICE_STATUS_LABELS[i.status] || i.status})`)
                      .join(', ')}
                  </p>
                  <p className="text-brand-700">
                    Las tarifas fijas ya cobradas no se vuelven a incluir. Solo podrás facturar ítems pendientes
                    (por ejemplo, horas que quedaron sin facturar).
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {preview.unassigned?.length ? (
            <Card className="mb-4 border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-2.5 text-sm text-amber-800">
                <AlertTriangle size={18} className="shrink-0" />
                <div>
                  <p className="font-semibold">Horas de developers sin asignación activa en este proyecto:</p>
                  {preview.unassigned.map((u: any) => (
                    <p key={u.developer.documentId}>
                      {u.developer.name}: {hours(u.hours)} ({u.entryCount} registros) — asígnalo en el proyecto para poder facturarlas.
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          <TableWrap>
            <thead>
              <tr>
                <Th>Developer</Th>
                <Th>Rol</Th>
                <Th>Esquema</Th>
                <Th right>Horas</Th>
                <Th right>Pago al dev</Th>
                <Th right>Cobro al cliente</Th>
                <Th right>Margen</Th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r: any) => {
                const skipped = r.billingType === 'fixed' && r.alreadyBilled
                return (
                  <tr
                    key={r.assignmentId}
                    className={(r.billingType === 'hourly' && r.hours === 0) || skipped ? 'opacity-45' : ''}
                  >
                    <Td className="font-medium text-slate-900">{r.developer.name}</Td>
                    <Td>{r.role}</Td>
                    <Td>
                      <Badge tone={r.billingType === 'hourly' ? 'blue' : 'violet'}>
                        {BILLING_TYPE_LABELS[r.billingType]}
                      </Badge>
                      {skipped ? (
                        <span className="block pt-1 text-[10px] font-medium text-amber-700">
                          ya facturada en este período
                        </span>
                      ) : null}
                    </Td>
                    <Td right>
                      {hours(r.hours)}
                      {r.billingType === 'fixed' ? <span className="block text-[10px] text-slate-400">referencia</span> : null}
                    </Td>
                    <Td right>
                      {skipped ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <>
                          <span className="font-medium">{money(r.devAmount)}</span>
                          {r.billingType === 'hourly' ? (
                            <span className="block text-[10px] text-slate-400">{money(r.devRate)}/h</span>
                          ) : (
                            <span className="block text-[10px] text-slate-400">fijo mensual</span>
                          )}
                        </>
                      )}
                    </Td>
                    <Td right>
                      {skipped ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <>
                          <span className="font-medium">{money(r.clientAmount)}</span>
                          {r.billingType === 'hourly' ? (
                            <span className="block text-[10px] text-slate-400">{money(r.clientRate)}/h</span>
                          ) : null}
                        </>
                      )}
                    </Td>
                    <Td right className="font-medium text-emerald-600">
                      {skipped ? <span className="text-slate-400">—</span> : money(r.clientAmount - r.devAmount)}
                    </Td>
                  </tr>
                )
              })}
              {!preview.rows.length && (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-slate-400">
                    Este proyecto no tiene developers asignados.
                  </Td>
                </tr>
              )}
            </tbody>
            {billableRows.length ? (
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <Td colSpan={4 as any}>Totales del período</Td>
                  <Td right>{money(preview.totals.devTotal)}</Td>
                  <Td right>{money(preview.totals.clientTotal)}</Td>
                  <Td right className="text-emerald-600">{money(preview.totals.agencyProfit)}</Td>
                </tr>
              </tfoot>
            ) : null}
          </TableWrap>

          <Card className="mt-4 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Notas para la factura (opcional)" className="min-w-60 flex-1">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Servicios de desarrollo — agosto" />
              </Field>
              <Button
                icon={ArrowRight}
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
                disabled={!billableRows.length}
              >
                Generar factura + reporte de pago
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Crea la factura al cliente ({money(preview.totals.clientTotal)}) y el reporte de pago a devs ({money(preview.totals.devTotal)}), y marca las horas como facturadas. Ganancia de la agencia: {money(preview.totals.agencyProfit)}.
            </p>
            {generateMutation.error ? <div className="mt-2"><ErrorNote error={generateMutation.error} /></div> : null}
          </Card>
        </>
      ) : null}
    </div>
  )
}

function InvoicesTab() {
  const qc = useQueryClient()
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () =>
      rest.list('invoices', {
        populate: { project: true, client: true },
        sort: 'number:desc',
        pagination: { pageSize: 100 },
      }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => rest.update('invoices', id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  if (isLoading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    )

  if (!invoices?.length)
    return <EmptyState icon={FileText} title="Sin facturas" description="Genera la primera desde la pestaña Por facturar." />

  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>Número</Th>
          <Th>Proyecto / Cliente</Th>
          <Th>Período</Th>
          <Th right>Total</Th>
          <Th>Estado</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv: any) => (
          <tr key={inv.documentId} className="hover:bg-slate-50">
            <Td className="font-medium text-slate-900">{inv.number}</Td>
            <Td>
              <p className="text-slate-800">{inv.project?.name || '—'}</p>
              <p className="text-xs text-slate-400">{inv.client?.name}</p>
            </Td>
            <Td className="whitespace-nowrap text-slate-500">
              {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
            </Td>
            <Td right className="font-semibold">{money(inv.total)}</Td>
            <Td>
              <Badge tone={INVOICE_STATUS_TONES[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
            </Td>
            <Td>
              <div className="flex items-center justify-end gap-1.5">
                {inv.status === 'draft' && (
                  <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate({ id: inv.documentId, status: 'sent' })}>
                    Marcar enviada
                  </Button>
                )}
                {inv.status === 'sent' && (
                  <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate({ id: inv.documentId, status: 'paid' })}>
                    Marcar pagada
                  </Button>
                )}
                <Link to={`/billing/invoices/${inv.documentId}`}>
                  <Button size="sm" variant="ghost" icon={Eye}>
                    Ver
                  </Button>
                </Link>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

/** Un ítem cuenta como pagado si tiene la marca explícita, o si el reporte viejo ya estaba pagado globalmente. */
const itemIsPaid = (report: any, it: any) => it.paid === true || (it.paid === undefined && report.status === 'paid')

function ReportsTab() {
  const qc = useQueryClient()
  const [detail, setDetail] = useState<any | null>(null)

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () =>
      rest.list('payment-reports', {
        populate: { project: true, invoice: true },
        sort: 'number:desc',
        pagination: { pageSize: 100 },
      }),
  })

  // Pago individual: alterna un ítem (o marca todos) y deriva el estado global del reporte.
  const payMutation = useMutation({
    mutationFn: async ({ report, index, all }: { report: any; index?: number; all?: boolean }) => {
      const items = (report.items || []).map((it: any, i: number) => {
        const current = itemIsPaid(report, it)
        const next = all ? true : i === index ? !current : current
        return { ...it, paid: next, paidDate: next ? it.paidDate || todayISO() : null }
      })
      const allPaid = items.length > 0 && items.every((it: any) => it.paid)
      return rest.update('payment-reports', report.documentId, {
        items,
        status: allPaid ? 'paid' : 'pending',
        paidDate: allPaid ? todayISO() : null,
      })
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      setDetail((d: any) => (d ? { ...d, ...updated } : d))
    },
  })

  if (isLoading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    )

  if (!reports?.length)
    return <EmptyState icon={Wallet} title="Sin reportes de pago" description="Se generan junto con cada factura." />

  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <Th>Número</Th>
            <Th>Proyecto</Th>
            <Th>Período</Th>
            <Th right>Pago a devs</Th>
            <Th right>Ganancia</Th>
            <Th>Estado</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {reports.map((r: any) => {
            const paidCount = (r.items || []).filter((it: any) => itemIsPaid(r, it)).length
            const totalItems = (r.items || []).length
            return (
              <tr key={r.documentId} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-900">{r.number}</Td>
                <Td>
                  {r.kind === 'internal' ? (
                    <Badge tone="violet">Nómina interna</Badge>
                  ) : (
                    r.project?.name || '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap text-slate-500">
                  {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
                </Td>
                <Td right className="font-semibold">{money(r.totalDevPay)}</Td>
                <Td right className="font-medium text-emerald-600">
                  {r.kind === 'internal' ? <span className="text-slate-400">—</span> : money(r.agencyProfit)}
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <Badge tone={r.status === 'paid' ? 'green' : 'amber'}>{REPORT_STATUS_LABELS[r.status]}</Badge>
                    <span className="text-xs text-slate-400">
                      {paidCount}/{totalItems}
                    </span>
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => setDetail(r)}>
                      Detalle
                    </Button>
                  </div>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`${detail?.kind === 'internal' ? 'Nómina' : 'Reporte de pago'} ${detail?.number || ''}`}
        wide
        footer={
          detail && (detail.items || []).some((it: any) => !itemIsPaid(detail, it)) ? (
            <Button
              onClick={() => payMutation.mutate({ report: detail, all: true })}
              loading={payMutation.isPending}
            >
              Marcar todo pagado
            </Button>
          ) : undefined
        }
      >
        {detail ? (
          <div>
            <p className="mb-4 text-sm text-slate-500">
              {detail.kind === 'internal'
                ? 'Nómina del personal interno'
                : `${detail.project?.name || ''} · Factura asociada: ${detail.invoice?.number || '—'}`}{' '}
              · {fmtDate(detail.periodStart)} – {fmtDate(detail.periodEnd)}
            </p>
            <div className="space-y-2.5">
              {(detail.items || []).map((it: any, i: number) => {
                const paid = itemIsPaid(detail, it)
                return (
                  <div key={i} className={`rounded-lg border p-3 ${paid ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{it.developer}</p>
                        <p className="text-xs text-slate-500">
                          {it.role} ·{' '}
                          {it.billingType === 'hourly'
                            ? `${hours(it.hours)} × ${money(it.rate)}/h`
                            : detail.kind === 'internal'
                              ? 'Sueldo mensual'
                              : 'Tarifa fija mensual'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-slate-900">{money(it.amount)}</p>
                          {paid ? (
                            <p className="text-xs text-emerald-600">Pagado {it.paidDate ? fmtDate(it.paidDate) : ''}</p>
                          ) : (
                            <p className="text-xs text-amber-600">Pendiente</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={paid ? 'ghost' : 'primary'}
                          onClick={() => payMutation.mutate({ report: detail, index: i })}
                          loading={payMutation.isPending}
                        >
                          {paid ? 'Desmarcar' : 'Marcar pagado'}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-semibold">
                        {it.method ? PAYMENT_TYPE_LABELS[it.method.type] || it.method.type : 'Sin método de pago'}
                      </span>
                      {it.method?.accountName ? ` · ${it.method.accountName}` : ''}
                      {it.method?.details ? ` · ${it.method.details}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex justify-between rounded-lg bg-slate-900 px-4 py-3 text-sm text-white">
              <span>{detail.kind === 'internal' ? 'Total nómina del período' : 'Total a pagar a developers'}</span>
              <span className="font-semibold">{money(detail.totalDevPay)}</span>
            </div>
            {detail.kind !== 'internal' ? (
              <p className="mt-2 text-right text-xs text-emerald-600">
                Ganancia de la agencia en este período: {money(detail.agencyProfit)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  )
}

function PayrollTab() {
  const qc = useQueryClient()
  const [, setParams] = useSearchParams()
  const [month, setMonth] = useState(monthStartISO().slice(0, 7))
  const [result, setResult] = useState<any | null>(null)

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () =>
      rest.list('staff-members', {
        populate: { paymentMethods: true },
        sort: 'firstName:asc',
        pagination: { pageSize: 100 },
      }),
  })

  const periodStart = `${month}-01`
  const periodEnd = (() => {
    const [y, m] = month.split('-').map(Number)
    const last = new Date(y, m, 0).getDate()
    return `${month}-${String(last).padStart(2, '0')}`
  })()

  const generateMutation = useMutation({
    mutationFn: () => api('/billing/payroll', { method: 'POST', body: { periodStart, periodEnd } }),
    onSuccess: (res) => {
      setResult(res)
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  if (isLoading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    )

  const active = (staff || []).filter((s: any) => s.active)
  const total = active.reduce((sum: number, s: any) => sum + Number(s.monthlySalary || 0), 0)

  if (!(staff || []).length)
    return (
      <EmptyState
        icon={Briefcase}
        title="Aún no hay personal interno"
        description="Registra a la administradora, CEO y demás personal con sueldo fijo en Equipo interno, y luego genera aquí su nómina mensual."
        action={
          <Link to="/staff">
            <Button icon={Briefcase}>Ir a Equipo interno</Button>
          </Link>
        }
      />
    )

  return (
    <div>
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Mes de la nómina">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          </Field>
          <p className="ml-auto text-sm text-slate-500">
            {active.length} personas activas · Total: <span className="font-semibold text-slate-900">{money(total)}</span>
          </p>
        </div>
      </Card>

      {result ? (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={20} />
            <p className="flex-1 text-sm font-semibold text-emerald-800">
              Nómina {result.paymentReport.number} generada para {result.people} personas.
            </p>
            <Button size="sm" variant="secondary" icon={Eye} onClick={() => setParams({ tab: 'reports' })}>
              Ver en reportes de pago
            </Button>
          </div>
        </Card>
      ) : null}

      <TableWrap>
        <thead>
          <tr>
            <Th>Integrante</Th>
            <Th>Cargo</Th>
            <Th>Método de pago</Th>
            <Th right>Sueldo mensual</Th>
          </tr>
        </thead>
        <tbody>
          {active.map((s: any) => {
            const preferred = (s.paymentMethods || []).find((m: any) => m.preferred) || s.paymentMethods?.[0]
            return (
              <tr key={s.documentId}>
                <Td className="font-medium text-slate-900">
                  {s.firstName} {s.lastName}
                </Td>
                <Td>{s.cargo}</Td>
                <Td>
                  <span className="text-xs text-slate-500">
                    {preferred ? `${PAYMENT_TYPE_LABELS[preferred.type] || preferred.type}${preferred.details ? ` · ${preferred.details}` : ''}` : '—'}
                  </span>
                </Td>
                <Td right className="font-semibold">{money(s.monthlySalary)}</Td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold">
            <Td colSpan={3}>Total de la nómina</Td>
            <Td right>{money(total)}</Td>
          </tr>
        </tfoot>
      </TableWrap>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            icon={ArrowRight}
            onClick={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
            disabled={!active.length}
          >
            Generar nómina de {monthLabel(month)}
          </Button>
          <p className="text-xs text-slate-400">
            Crea un reporte de pago interno con el sueldo de cada persona activa, para marcar cada pago individualmente.
          </p>
        </div>
        {generateMutation.error ? <div className="mt-2"><ErrorNote error={generateMutation.error} /></div> : null}
      </Card>
    </div>
  )
}

export default function Billing() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'unbilled'

  return (
    <div>
      <PageHeader title="Facturación" subtitle="Horas sin facturar, facturas, pagos a developers y nómina interna" />
      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t })}
        tabs={[
          { key: 'unbilled', label: 'Por facturar' },
          { key: 'invoices', label: 'Facturas' },
          { key: 'reports', label: 'Reportes de pago' },
          { key: 'payroll', label: 'Nómina interna' },
        ]}
      />
      {tab === 'unbilled' && <UnbilledTab />}
      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'payroll' && <PayrollTab />}
    </div>
  )
}
