export const LEVEL_LABELS: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  full_time: 'Tiempo completo',
  part_time: 'Medio tiempo',
  unavailable: 'No disponible',
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: 'Planeación',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'En revisión',
  done: 'Completada',
}

export const TASK_STATUS_ORDER = ['todo', 'in_progress', 'review', 'done'] as const

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  paid: 'Pagada',
}

export const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bancolombia: 'Bancolombia',
  efectivo: 'Efectivo',
  otro: 'Otro',
}

export const BILLING_TYPE_LABELS: Record<string, string> = {
  hourly: 'Por hora',
  fixed: 'Tarifa fija mensual',
}
