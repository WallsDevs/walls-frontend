import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/** useState que se guarda en localStorage bajo `key`. Si no se puede leer/escribir, funciona como useState normal. */
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }, [key, value])

  return [value, setValue]
}
