import { useEffect, useState } from 'react'
import { Bookmark, FileText, Globe, Heart, MessageCircle, MoreHorizontal, Repeat2, Send, ThumbsUp } from 'lucide-react'
import { mediaKind, type MediaItem } from '../lib/content'
import { cx } from './ui'

/**
 * Vista previa de cómo se vería la publicación en LinkedIn o Instagram: encabezado, texto con el
 * corte de "ver más" de cada red, archivos y primer comentario. Es una aproximación fiel del
 * layout, no una captura real de la plataforma.
 */

const AUTHOR = { name: 'Luis Paredes', handle: 'wallsteam', headline: 'Walls Team · Software a medida, automatización e IA' }

/** Quita las marcas de formato ligero (**, *, "- ") que las redes no interpretan. */
const plain = (t: string) => (t || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1').replace(/^\s*[-•]\s+/gm, '• ')

/** Resalta hashtags y menciones en azul, como hacen ambas redes. */
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|@[\p{L}\p{N}_.]+)/u)
  return (
    <>
      {parts.map((p, i) => (/^[#@]/.test(p) ? <span key={i} className="text-[#0a66c2]">{p}</span> : <span key={i}>{p}</span>))}
    </>
  )
}

function Truncated({ text, limit, moreLabel, className }: { text: string; limit: number; moreLabel: string; className?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [text])
  const t = plain(text)
  const needsCut = t.length > limit
  const shown = open || !needsCut ? t : t.slice(0, limit).replace(/\s+\S*$/, '')
  return (
    <p className={cx('whitespace-pre-line', className)}>
      <Highlighted text={shown} />
      {needsCut && !open ? (
        <>
          {'… '}
          <button type="button" onClick={() => setOpen(true)} className="text-slate-500 hover:underline">
            {moreLabel}
          </button>
        </>
      ) : null}
    </p>
  )
}

function Avatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-bold text-white', size === 'md' ? 'size-12 text-sm' : 'size-8 text-[10px]')}>
      LP
    </span>
  )
}

function MediaBlock({ media, format, ratio, network }: { media: MediaItem[]; format?: string; ratio: string; network: 'linkedin' | 'instagram' }) {
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(0), [media.length])
  // LinkedIn: el PDF es el carrusel (tiene prioridad); si no hay, imágenes o vídeo.
  // Instagram: solo imágenes y vídeos (varias imágenes = carrusel); el PDF no se puede subir.
  const pdfs = media.filter((m) => mediaKind(m) === 'pdf')
  const visuals = media.filter((m) => ['image', 'video'].includes(mediaKind(m)))
  const visual = network === 'linkedin' && pdfs.length ? pdfs.slice(0, 1) : visuals
  if (!visual.length) {
    if (format === 'encuesta' && network === 'linkedin') {
      return (
        <div className="mx-3 mb-3 rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-900">Encuesta</p>
          {['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'].map((o) => (
            <div key={o} className="mb-1.5 rounded-full border border-[#0a66c2] px-3 py-1.5 text-center text-sm font-semibold text-[#0a66c2]">
              {o}
            </div>
          ))}
          <p className="text-xs text-slate-500">0 votos · 1 semana restante</p>
        </div>
      )
    }
    if (network === 'instagram') {
      return (
        <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 bg-slate-100 px-6 text-center text-xs text-slate-500">
          {pdfs.length ? (
            <>
              <span className="font-medium text-slate-700">Instagram no acepta PDF</span>
              <span>Exporta las diapositivas del carrusel como imágenes (1080 × 1350) y súbelas: cada imagen será una diapositiva.</span>
            </>
          ) : (
            'Sube una o varias imágenes (carrusel) o un vídeo para ver la publicación'
          )}
        </div>
      )
    }
    return null
  }
  const current = visual[Math.min(index, visual.length - 1)]
  const kind = mediaKind(current)
  const multi = visual.length > 1 || (format === 'carrusel' && kind !== 'video')
  return (
    <div className="relative w-full bg-black" style={{ aspectRatio: ratio }}>
      {kind === 'image' ? (
        <img src={current.url} alt="" className="size-full object-cover" />
      ) : kind === 'video' ? (
        <video src={current.url} controls className="size-full object-contain" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-slate-800 text-slate-100">
          <FileText size={34} />
          <span className="text-xs">Carrusel PDF · {current.name}</span>
          <span className="text-[11px] text-slate-400">LinkedIn lo muestra como documento deslizable, página a página</span>
        </div>
      )}
      {multi ? (
        <>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            {kind === 'pdf' ? 'PDF' : `${index + 1}/${Math.max(visual.length, 1)}`}
          </span>
          {visual.length > 1 ? (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {visual.map((_, i) => (
                <button key={i} type="button" onClick={() => setIndex(i)} className={cx('size-1.5 rounded-full', i === index ? 'bg-white' : 'bg-white/50')} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function LinkedInPreview({ body, firstComment, media, format }: { body: string; firstComment: string; media: MediaItem[]; format?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 shadow-sm" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      <div className="flex items-start gap-2 px-3 pt-3">
        <Avatar />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{AUTHOR.name}</p>
          <p className="truncate text-xs text-slate-500">{AUTHOR.headline}</p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            Ahora · <Globe size={11} />
          </p>
        </div>
        <MoreHorizontal size={18} className="text-slate-500" />
      </div>
      <div className="px-3 pb-2 pt-2">
        {body ? <Truncated text={body} limit={210} moreLabel="…más" className="leading-snug" /> : <p className="text-slate-400">Escribe el texto del post para verlo aquí.</p>}
      </div>
      <MediaBlock media={media} format={format} ratio="4 / 5" network="linkedin" />
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="flex size-4 items-center justify-center rounded-full bg-[#0a66c2] text-white">
            <ThumbsUp size={9} />
          </span>
          <span className="flex size-4 items-center justify-center rounded-full bg-red-500 text-white">
            <Heart size={9} />
          </span>
          24
        </span>
        <span>6 comentarios · 2 veces compartido</span>
      </div>
      <div className="grid grid-cols-4 px-1 py-1 text-xs font-semibold text-slate-600">
        {[
          ['Recomendar', ThumbsUp],
          ['Comentar', MessageCircle],
          ['Compartir', Repeat2],
          ['Enviar', Send],
        ].map(([label, Icon]: any) => (
          <span key={label} className="inline-flex items-center justify-center gap-1.5 rounded py-2 hover:bg-slate-100">
            <Icon size={15} /> {label}
          </span>
        ))}
      </div>
      {firstComment ? (
        <div className="flex gap-2 border-t border-slate-100 px-3 py-3">
          <Avatar size="sm" />
          <div className="min-w-0 flex-1 rounded-r-lg rounded-bl-lg bg-slate-100 px-3 py-2">
            <p className="text-xs font-semibold">
              {AUTHOR.name} <span className="font-normal text-slate-500">· Autor</span>
            </p>
            <p className="mt-0.5 whitespace-pre-line text-xs leading-snug">
              <Highlighted text={plain(firstComment)} />
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function InstagramPreview({ body, firstComment, media, format }: { body: string; firstComment: string; media: MediaItem[]; format?: string }) {
  const caption = plain(body)
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 shadow-sm" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <span className="block rounded-full bg-white p-[2px]">
            <Avatar size="sm" />
          </span>
        </span>
        <p className="flex-1 text-sm font-semibold">{AUTHOR.handle}</p>
        <MoreHorizontal size={18} className="text-slate-700" />
      </div>
      <MediaBlock media={media} format={format} ratio="4 / 5" network="instagram" />
      <div className="flex items-center gap-4 px-3 py-2 text-slate-800">
        <Heart size={22} />
        <MessageCircle size={22} />
        <Send size={22} />
        <Bookmark size={22} className="ml-auto" />
      </div>
      <div className="px-3 pb-3">
        <p className="mb-1 text-sm font-semibold">128 Me gusta</p>
        {caption ? (
          <div className="text-sm leading-snug">
            <span className="float-left mr-1 font-semibold">{AUTHOR.handle}</span>
            <Truncated text={caption} limit={125} moreLabel="más" />
          </div>
        ) : (
          <p className="text-sm text-slate-400">Escribe el texto del post para verlo como pie de foto.</p>
        )}
        {firstComment ? (
          <p className="mt-1.5 text-sm leading-snug">
            <span className="font-semibold">{AUTHOR.handle}</span> <Highlighted text={plain(firstComment)} />
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] uppercase tracking-wide text-slate-400">Hace 1 minuto</p>
      </div>
    </div>
  )
}

export default function SocialPreview({
  body,
  firstComment,
  media,
  format,
  networks,
}: {
  body: string
  firstComment: string
  media: MediaItem[]
  format?: string
  networks: string[]
}) {
  const available = ['linkedin', 'instagram']
  const preferred = networks.find((n) => available.includes(n)) || 'linkedin'
  const [network, setNetwork] = useState<'linkedin' | 'instagram'>(preferred as any)
  useEffect(() => {
    if (networks.length && !networks.includes(network)) setNetwork(preferred as any)
  }, [networks.join(',')])

  const bodyLen = plain(body).length
  const limit = network === 'linkedin' ? 3000 : 2200
  const cut = network === 'linkedin' ? 210 : 125

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {available.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNetwork(n as any)}
              className={cx('rounded-md px-2.5 py-1 text-xs font-medium', network === n ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50', !networks.includes(n) && network !== n && 'opacity-60')}
            >
              {n === 'linkedin' ? 'LinkedIn' : 'Instagram'}
            </button>
          ))}
        </div>
        <span className={cx('text-[11px]', bodyLen > limit ? 'font-medium text-red-600' : 'text-slate-400')}>
          {bodyLen.toLocaleString('es')} / {limit.toLocaleString('es')} caracteres · corte "ver más" a los {cut}
        </span>
      </div>
      <div className="mx-auto w-full max-w-[560px]">
        {network === 'linkedin' ? (
          <LinkedInPreview body={body} firstComment={firstComment} media={media} format={format} />
        ) : (
          <InstagramPreview body={body} firstComment={firstComment} media={media} format={format} />
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Aproximación del diseño de {network === 'linkedin' ? 'LinkedIn: el texto se corta a unas 3 líneas con "…más" y los PDF se muestran como carrusel' : 'Instagram: el pie se corta con "más", la imagen va en 4:5 o 1:1 y los enlaces no son clicables'}.
      </p>
    </div>
  )
}
