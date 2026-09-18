// Espejo de backend/src/api/lead/services/stage-rules.js: aquí solo sirve para pedir lo que falta
// antes de llamar al API; el backend vuelve a validar y es la fuente de verdad.

export const CLOSE_REASON_LABELS: Record<string, string> = {
  precio: 'Precio',
  eligio_freelancer: 'Eligió freelancer',
  sin_respuesta: 'Sin respuesta',
  sin_presupuesto: 'Sin presupuesto',
  no_califico: 'No calificó',
  otro: 'Otro',
}

export const CONTACT_LEVEL_LABELS: Record<string, string> = {
  directo: 'Directo',
  correo_directo: 'Correo directo',
  linkedin: 'Solo LinkedIn',
  generico: 'Genérico',
}

export const CONTACT_LEVEL_HINTS: Record<string, string> = {
  directo: 'Número o WhatsApp de la persona que decide',
  correo_directo: 'Correo personal de la persona que decide',
  linkedin: 'Solo se puede abrir conversación por LinkedIn o redes',
  generico: 'Solo formulario web o correo tipo info@',
}

const GENERIC_EMAIL_PREFIXES = ['info', 'contacto', 'contact', 'hola', 'hello', 'soporte', 'support', 'ventas', 'sales', 'team', 'admin', 'marketing']

export const isGenericEmail = (email: string) => GENERIC_EMAIL_PREFIXES.includes(String(email || '').split('@')[0].toLowerCase())

/** Espejo de backend/src/lead-contacts.js: sugerencia a partir de lo que se sabe de los contactos. */
export function suggestContactLevel(contacts: any[] | undefined) {
  const list = contacts || []
  if (list.some((c) => c.phone)) return 'directo'
  if (list.some((c) => c.email && !isGenericEmail(c.email))) return 'correo_directo'
  if (list.some((c) => c.linkedinUrl)) return 'linkedin'
  return 'generico'
}

export const NEEDS_NEXT_STEP = ['prospeccion', 'llamada', 'propuesta']

/** Estado de la fecha de próximo paso: vencido, hoy, pronto (≤ 2 días), ok o sin fecha. Solo aplica a etapas abiertas. */
export type NextStepStatus = 'overdue' | 'today' | 'soon' | 'ok'

/**
 * ¿La etapa exige fecha de próximo paso (y por tanto un lead ahí puede vencer)?
 * Si no está configurado, se asume que sí salvo en Por revisar y en las etapas finales.
 * Espejo de backend/src/lead-stages.js → stageTracksNextStep.
 */
export function stageTracksNextStep(stage: any): boolean {
  if (!stage) return true
  if (stage.tracksNextStep === true || stage.tracksNextStep === false) return stage.tracksNextStep
  return stage.outcome === 'open' && stage.slug !== 'por_revisar'
}

export function nextStepStatus(lead: any, today = new Date().toISOString().slice(0, 10)): NextStepStatus | null {
  const date = lead?.nextFollowUpDate
  if (!date) return null
  if (!stageTracksNextStep(lead.stage)) return null
  if (date < today) return 'overdue'
  if (date === today) return 'today'
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86400000)
  return days <= 2 ? 'soon' : 'ok'
}

export function nextStepLabel(status: NextStepStatus | null, date: string) {
  if (status === 'overdue') return `Venció ${date}`
  if (status === 'today') return 'Vence hoy'
  if (status === 'soon') return `Vence pronto · ${date}`
  return `Próximo paso ${date}`
}

/** Colores por estado: texto, borde de card y fondo/borde del input. */
export const NEXT_STEP_STYLES: Record<NextStepStatus, { text: string; border: string; field: string; badge: 'red' | 'amber' | 'blue' | 'gray' }> = {
  overdue: { text: 'text-red-600', border: 'border-red-300', field: 'border-red-300 bg-red-50 text-red-700', badge: 'red' },
  today: { text: 'text-amber-600', border: 'border-amber-300', field: 'border-amber-300 bg-amber-50 text-amber-800', badge: 'amber' },
  soon: { text: 'text-amber-600', border: 'border-amber-200', field: 'border-amber-300 bg-amber-50 text-amber-800', badge: 'amber' },
  ok: { text: 'text-slate-400', border: 'border-slate-200', field: '', badge: 'gray' },
}

export type StageNeed = 'closeReason' | 'nextFollowUpDate'

const isBlank = (v: unknown) => v === null || v === undefined || v === ''

export function defaultStage(stages: any[]) {
  return stages.find((s) => s.slug === 'por_revisar') ?? stages[0]
}

export function stageChangeRequirements(lead: any, target: any): { blocked?: string; needs: StageNeed[] } {
  const slug = target?.slug
  if (!slug) return { needs: [] }

  if (slug === 'propuesta') {
    const score = lead.qualificationScore
    if (isBlank(score) || !(Number(score) >= 7)) {
      return {
        blocked: `Para pasar a Propuesta el puntaje de calificación debe ser 7 o más (actual: ${isBlank(score) ? 'sin puntaje' : score})`,
        needs: [],
      }
    }
  }

  const needs: StageNeed[] = []
  if (slug === 'cerrado_sin_venta' && isBlank(lead.closeReason)) needs.push('closeReason')
  if (NEEDS_NEXT_STEP.includes(slug) && isBlank(lead.nextFollowUpDate)) needs.push('nextFollowUpDate')
  return { needs }
}
