import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Button, Field, Input, Modal, ErrorNote, cx } from './ui'

/**
 * Crea o vincula la cuenta de acceso para un developer o cliente.
 * Para developers permite: acceso de developer (su portal), acceso de administrador
 * (panel completo), o vincular el perfil a un usuario que ya existe (ej. un admin).
 */
export default function AccountModal({
  open,
  onClose,
  type,
  profileId,
  defaultEmail,
  name,
}: {
  open: boolean
  onClose: () => void
  type: 'developer' | 'client'
  profileId: string
  defaultEmail?: string
  name: string
}) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'create' | 'link'>('create')
  const [accessRole, setAccessRole] = useState<'developer' | 'admin'>('developer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (open) {
      setMode('create')
      setAccessRole('developer')
      setEmail(defaultEmail || '')
      setPassword('')
    }
  }, [open, defaultEmail])

  const linking = type === 'developer' && mode === 'link'

  const mutation = useMutation({
    mutationFn: () =>
      api('/accounts', {
        method: 'POST',
        body: {
          type,
          profile: profileId,
          email,
          ...(linking ? { linkExisting: true } : { password, ...(type === 'developer' ? { role: accessRole } : {}) }),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries()
      onClose()
    },
  })

  const optionCls = (active: boolean) =>
    cx(
      'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
      active ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-slate-300',
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Crear acceso para ${name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!email || (!linking && password.length < 6)}
          >
            {linking ? 'Vincular cuenta' : 'Crear cuenta'}
          </Button>
        </>
      }
    >
      {type === 'developer' ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('create')} className={optionCls(mode === 'create')}>
            <span className="block font-medium">Crear cuenta nueva</span>
            <span className="text-xs opacity-70">Usuario nuevo con correo y contraseña</span>
          </button>
          <button type="button" onClick={() => setMode('link')} className={optionCls(mode === 'link')}>
            <span className="block font-medium">Vincular cuenta existente</span>
            <span className="text-xs opacity-70">Ej.: un admin que también trabaja horas</span>
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-500">
          El cliente podrá entrar al portal para ver reportes de horas y sus facturas.
        </p>
      )}

      {type === 'developer' && !linking ? (
        <div className="mb-4">
          <span className="mb-1 block text-xs font-medium text-slate-600">Tipo de acceso</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAccessRole('developer')} className={optionCls(accessRole === 'developer')}>
              <span className="block font-medium">Portal de developer</span>
              <span className="text-xs opacity-70">Solo sus tareas y sus horas</span>
            </button>
            <button type="button" onClick={() => setAccessRole('admin')} className={optionCls(accessRole === 'admin')}>
              <span className="block font-medium">Administrador</span>
              <span className="text-xs opacity-70">Panel completo + sus tareas y horas</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <Field label={linking ? 'Correo del usuario existente' : 'Correo de acceso'}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
        </Field>
        {!linking ? (
          <Field label="Contraseña" hint="Mínimo 6 caracteres. Compártela de forma segura.">
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña temporal" />
          </Field>
        ) : (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            Se vinculará este perfil al usuario existente, sin cambiar su rol ni su contraseña. Sus horas y tareas
            aparecerán en la sección "Mi trabajo" de su panel.
          </p>
        )}
        {mutation.error ? <ErrorNote error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}
