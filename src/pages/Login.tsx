import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button, Field, Input } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-xl font-bold text-white shadow-lg">
            W
          </div>
          <h1 className="text-lg font-semibold text-white">Walls · Panel administrativo</h1>
          <p className="text-sm text-slate-400">Gestión de proyectos, horas y facturación</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="space-y-4">
            <Field label="Correo o usuario">
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@walls.dev"
                autoFocus
                required
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>
          </div>
        </form>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-relaxed text-slate-400">
          <p className="mb-1 font-semibold text-slate-300">Cuentas de demostración (clave: Walls123!)</p>
          <p>Admin: admin@walls.dev · Dev: carlos@walls.dev · Cliente: cliente@fairpay.com</p>
        </div>
      </div>
    </div>
  )
}
