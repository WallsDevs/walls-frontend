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
