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
