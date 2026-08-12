export const money = (n: number | null | undefined, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    Number(n || 0),
  )

export const hours = (n: number | null | undefined) => {
  const v = Number(n || 0)
  return `${v % 1 === 0 ? v : v.toFixed(1)} h`
}

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  const date = new Date(`${d}T12:00:00`)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, 1)
  const label = new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(date)
  return label.replace('.', '').replace(' de ', ' ')
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const monthStartISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export const monthEndISO = () => {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
