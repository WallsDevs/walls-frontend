import type { BadgeTone } from '../components/ui'

/** Módulo Contenido: etiquetas, colores y helpers compartidos. */

export const CONTENT_STATUS_ORDER = ['idea', 'redactado', 'disenado', 'programado', 'publicado', 'descartado'] as const
export type ContentStatus = (typeof CONTENT_STATUS_ORDER)[number]

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  redactado: 'Redactado',
  disenado: 'Diseñado',
  programado: 'Programado',
  publicado: 'Publicado',
  descartado: 'Descartado',
}

export const CONTENT_STATUS_TONES: Record<string, BadgeTone> = {
  idea: 'gray',
  redactado: 'blue',
  disenado: 'violet',
  programado: 'amber',
  publicado: 'green',
  descartado: 'red',
}

export const CONTENT_STATUS_DOT: Record<string, string> = {
  idea: '#94a3b8',
  redactado: '#2a78d6',
  disenado: '#7c3aed',
  programado: '#f59e0b',
  publicado: '#059669',
  descartado: '#dc2626',
}

export const CONTENT_FORMAT_LABELS: Record<string, string> = {
  carrusel: 'Carrusel',
  imagen: 'Imagen',
  video: 'Vídeo',
  texto: 'Texto',
  encuesta: 'Encuesta',
}

export const CONTENT_PILLAR_LABELS: Record<string, string> = {
  portafolio: 'Portafolio',
  automatizacion_ia: 'Automatización e IA',
  mantenimiento: 'Mantenimiento',
  criterio: 'Criterio',
  tendencias: 'Tendencias y normativa',
  interaccion: 'Interacción',
}

export const NETWORK_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
}

export const NETWORK_TONES: Record<string, BadgeTone> = {
  linkedin: 'blue',
  instagram: 'violet',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Instante ISO → valor para <input type="datetime-local"> en la zona del navegador. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Valor de datetime-local (zona del navegador) → ISO UTC. */
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

/** "YYYY-MM-DD" local de un instante (para agrupar por día en el calendario). */
export const localDateKey = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Hora local del navegador, "HH:mm". */
export const localTime = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Misma hora vista desde España (el público del contenido). */
export const spainTime = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  } catch {
    return ''
  }
}

/** Fecha corta con día de la semana: "mar 16 sept". */
export const shortDay = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))

export const monthTitle = (year: number, month: number) => {
  const s = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export type MediaItem = { id: number; url: string; name: string; mime: string; size?: number }

export const mediaKind = (m: { mime?: string; name?: string }): 'image' | 'video' | 'pdf' | 'file' => {
  const mime = (m.mime || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf' || (m.name || '').toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'file'
}
