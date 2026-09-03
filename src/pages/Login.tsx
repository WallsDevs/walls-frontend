import { lazy, Suspense, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Field, Input } from '../components/ui'
import wordmark from '../assets/brand/logo-wordmark-white.svg'

const CompanionRobot = lazy(() => import('../components/CompanionRobot'))

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="flex min-h-screen items-center justify-center bg-[#231f20] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <Suspense fallback={<div className="mb-2 size-36" />}>
            <CompanionRobot className="mb-2 size-36" />
          </Suspense>
          <img src={wordmark} alt="Walls" className="h-7 w-auto" />
          <p className="mt-1.5 text-sm text-[#a8a5a6]">Panel administrativo</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/30">
          <div className="space-y-4">
            <Field label="Correo o usuario">
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="tú@walls.dev"
                autoFocus
                required
                className="focus:border-[#0147ff] focus:ring-[#0147ff]/15"
              />
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10 focus:border-[#0147ff] focus:ring-[#0147ff]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            {error ? (
              <p className="rounded-lg border border-[oklch(94%_0.05_25)] bg-[oklch(97%_0.025_25)] px-3 py-2 text-sm text-[oklch(58%_0.20_25)]">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0147ff] px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[oklch(48%_0.25_264)] disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
