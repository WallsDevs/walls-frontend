import { useRef, useState, type DragEvent } from 'react'
import { FileText, Film, Loader2, UploadCloud, X } from 'lucide-react'
import { API_URL, getAuth } from '../lib/api'
import { mediaKind, type MediaItem } from '../lib/content'
import { cx } from './ui'

const MB = 1024 * 1024
const LIMITS: Record<string, { max: number; label: string }> = {
  image: { max: 5 * MB, label: 'imagen' },
  video: { max: 100 * MB, label: 'vídeo' },
  pdf: { max: 25 * MB, label: 'PDF' },
}
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,video/mp4,video/quicktime,video/webm,application/pdf'
const mb = (b: number) => `${Math.round((b / MB) * 10) / 10} MB`

/**
 * Subida de archivos para contenido: imágenes, vídeos y PDF. Arrastrar y soltar o elegir.
 * Muestra miniaturas, reproduce vídeos y abre PDF. El servidor vuelve a validar tipo y tamaño.
 */
export default function MediaField({ value, onChange }: { value: MediaItem[]; onChange: (next: MediaItem[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const pick = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : []
    if (!list.length) return
    setError('')
    for (const f of list) {
      const kind = mediaKind({ mime: f.type, name: f.name })
      const rule = LIMITS[kind]
      if (!rule) {
        setError(`"${f.name}" no es un formato permitido. Solo imágenes, vídeos (MP4, MOV, WEBM) o PDF.`)
        return
      }
      if (f.size > rule.max) {
        setError(`"${f.name}" pesa ${mb(f.size)}. El máximo para ${rule.label} es ${mb(rule.max)}.`)
        return
      }
    }
    setUploading(list.map((f) => f.name))
    try {
      // Un archivo por petición: si uno falla, los demás se guardan igual.
      const saved: MediaItem[] = []
      for (const f of list) {
        const body = new FormData()
        body.append('files', f)
        const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${getAuth()?.jwt}` }, body })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || `No se pudo subir "${f.name}"`)
        for (const u of Array.isArray(json) ? json : [json]) saved.push({ id: u.id, url: u.url, name: u.name, mime: u.mime, size: u.size })
        setUploading((q) => q.filter((n) => n !== f.name))
      }
      onChange([...value, ...saved])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el archivo')
    } finally {
      setUploading([])
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading.length && inputRef.current?.click()}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-white',
        )}
      >
        {uploading.length ? <Loader2 size={22} className="animate-spin text-brand-500" /> : <UploadCloud size={22} className="text-slate-400" />}
        <p className="text-sm font-medium text-slate-700">{uploading.length ? `Subiendo ${uploading.join(', ')}…` : 'Arrastra aquí o haz clic para subir'}</p>
        <p className="text-xs text-slate-400">Imágenes hasta 5 MB · vídeos MP4/MOV/WEBM hasta 100 MB · PDF hasta 25 MB</p>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => pick(e.target.files)} />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {value.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((m) => {
            const kind = mediaKind(m)
            return (
              <div key={m.id} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                {kind === 'image' ? (
                  <a href={m.url} target="_blank" rel="noreferrer">
                    <img src={m.url} alt={m.name} className="aspect-[4/5] w-full object-cover" />
                  </a>
                ) : kind === 'video' ? (
                  <video src={m.url} controls preload="metadata" className="aspect-[4/5] w-full bg-black object-contain" />
                ) : (
                  <a href={m.url} target="_blank" rel="noreferrer" className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-500 hover:text-brand-600">
                    {kind === 'pdf' ? <FileText size={28} /> : <Film size={28} />}
                    <span className="text-xs font-medium">{kind === 'pdf' ? 'Abrir PDF' : 'Abrir archivo'}</span>
                  </a>
                )}
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="truncate text-[11px] text-slate-500" title={m.name}>
                    {m.name}
                  </span>
                  {m.size ? <span className="shrink-0 text-[10px] text-slate-400">{mb(m.size)}</span> : null}
                </div>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x.id !== m.id))}
                  title="Quitar archivo"
                  className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-500 opacity-0 shadow ring-1 ring-slate-200 transition-opacity hover:text-red-600 group-hover:opacity-100"
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
