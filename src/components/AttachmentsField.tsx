import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { API_URL, getAuth } from '../lib/api'

export type Attachment = { id: number; url: string; name: string }

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
const mb = (b: number) => `${Math.round((b / 1024 / 1024) * 10) / 10} MB`

/** Sube imágenes al backend y devuelve los adjuntos ya guardados. */
export default function AttachmentsField({
  value,
  onChange,
}: {
  value: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')

    // Se valida aquí para dar respuesta inmediata; el servidor vuelve a validar igual.
    for (const f of Array.from(files)) {
      if (!ALLOWED.includes(f.type)) {
        setError(`"${f.name}" no es una imagen permitida (JPG, PNG, WEBP, GIF o HEIC).`)
        return
      }
      if (f.size > MAX_BYTES) {
        setError(`"${f.name}" pesa ${mb(f.size)}. El máximo es ${mb(MAX_BYTES)}.`)
        return
      }
    }

    const body = new FormData()
    Array.from(files).forEach((f) => body.append('files', f))

    setUploading(true)
    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuth()?.jwt}` },
        body,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'No se pudo subir la imagen')
      const uploaded: Attachment[] = (Array.isArray(json) ? json : [json]).map((f: any) => ({
        id: f.id,
        url: f.url,
        name: f.name,
      }))
      onChange([...value, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((a) => (
          <div key={a.id} className="group relative">
            <a href={a.url} target="_blank" rel="noreferrer" title={a.name}>
              <img
                src={a.url}
                alt={a.name}
                className="size-20 rounded-lg border border-slate-200 object-cover transition-opacity group-hover:opacity-90"
              />
            </a>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.id !== a.id))}
              title="Quitar imagen"
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-slate-400 shadow ring-1 ring-slate-200 hover:text-red-600"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-500 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          <span className="text-[10px]">{uploading ? 'Subiendo…' : 'Agregar'}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <p className="text-xs text-slate-400">JPG, PNG, WEBP, GIF o HEIC · máximo 5 MB cada una</p>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
