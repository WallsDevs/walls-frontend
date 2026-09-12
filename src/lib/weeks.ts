// Semanas ISO (lunes a domingo) para agrupar y filtrar leads por semana de captación.

const MS_DAY = 86400000

const parse = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`)

/** Lunes de la semana a la que pertenece la fecha. */
export function weekStart(d: Date) {
  const day = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  monday.setHours(12, 0, 0, 0)
  return monday
}

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Clave estable de la semana: la fecha ISO de su lunes. */
export function weekKey(iso: string) {
  return toISO(weekStart(parse(iso)))
}

export function currentWeekKey(offsetWeeks = 0) {
  const monday = weekStart(new Date())
  monday.setDate(monday.getDate() + offsetWeeks * 7)
  return toISO(monday)
}

function isoWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / MS_DAY + 1) / 7)
}

const shortDay = (d: Date) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(d).replace('.', '')

/** "Semana 37 · 8–14 sep" */
export function weekLabel(key: string) {
  const monday = parse(key)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const sameMonth = monday.getMonth() === sunday.getMonth()
  const range = sameMonth ? `${monday.getDate()}–${shortDay(sunday)}` : `${shortDay(monday)} – ${shortDay(sunday)}`
  return `Semana ${isoWeekNumber(monday)} · ${range}`
}
