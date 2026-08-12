export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:1337'

const AUTH_KEY = 'walls_auth'

export type StoredAuth = { jwt: string; me: Me }

export type Me = {
  id: number
  username: string
  email: string
  role: 'admin' | 'developer' | 'client' | 'authenticated'
  profile: any
}

export function getAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

export function setAuth(auth: StoredAuth | null) {
  if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
  else localStorage.removeItem(AUTH_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  jwt?: string
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const jwt = opts.jwt ?? getAuth()?.jwt
  const res = await fetch(`${API_URL}/api${path}`, {
    method: opts.method || 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 401) {
    setAuth(null)
    if (!location.pathname.startsWith('/login')) location.assign('/login')
    throw new ApiError('Sesión expirada', 401)
  }

  const text = await res.text()
  const json = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = json?.error?.message || `Error ${res.status}`
    throw new ApiError(message, res.status)
  }
  return json as T
}

/** Serializa parámetros anidados al formato de Strapi: populate[a][populate][b]=true */
export function qs(params: Record<string, unknown>): string {
  const parts: string[] = []
  const walk = (key: string, val: unknown) => {
    if (val === undefined || val === null) return
    if (Array.isArray(val)) {
      val.forEach((v, i) => walk(`${key}[${i}]`, v))
    } else if (typeof val === 'object') {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) walk(`${key}[${k}]`, v)
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`)
    }
  }
  for (const [k, v] of Object.entries(params)) walk(k, v)
  return parts.length ? `?${parts.join('&')}` : ''
}

/** CRUD estándar de colecciones Strapi (solo admin). */
export const rest = {
  list: <T = any>(col: string, params: Record<string, unknown> = {}) =>
    api<{ data: T[] }>(`/${col}${qs(params)}`).then((r) => r.data),
  one: <T = any>(col: string, id: string, params: Record<string, unknown> = {}) =>
    api<{ data: T }>(`/${col}/${id}${qs(params)}`).then((r) => r.data),
  create: <T = any>(col: string, data: unknown) =>
    api<{ data: T }>(`/${col}`, { method: 'POST', body: { data } }).then((r) => r.data),
  update: <T = any>(col: string, id: string, data: unknown) =>
    api<{ data: T }>(`/${col}/${id}`, { method: 'PUT', body: { data } }).then((r) => r.data),
  remove: (col: string, id: string) => api(`/${col}/${id}`, { method: 'DELETE' }),
}
