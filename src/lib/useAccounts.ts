import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type AccountInfo = { email: string; username: string; role: string | null; blocked: boolean }
type AccountsMap = { developer: Record<string, AccountInfo>; client: Record<string, AccountInfo> }

/**
 * Qué perfiles ya tienen cuenta de acceso, por documentId.
 * Va por su propio endpoint porque el content API de Strapi no expone la relación con usuarios.
 */
export function useAccounts() {
  const { data } = useQuery<AccountsMap>({
    queryKey: ['accounts'],
    queryFn: () => api('/accounts'),
  })
  return {
    developerAccount: (documentId?: string) => (documentId ? data?.developer?.[documentId] : undefined),
    clientAccount: (documentId?: string) => (documentId ? data?.client?.[documentId] : undefined),
  }
}
