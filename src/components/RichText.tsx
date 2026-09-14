import { useRef, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Bold, Italic, List } from 'lucide-react'
import { cx } from './ui'

/**
 * Texto con formato ligero para notas y actividades:
 *   **negrita**, *cursiva*, líneas que empiezan con "- " (lista), saltos de línea,
 *   párrafos separados por línea en blanco, URLs clicables y etiquetas tipo "CONEXIÓN:" en negrita.
 * Se guarda como texto plano, así que lo que ya existe se sigue viendo igual (solo mejor).
 */

const URL_RE = /(https?:\/\/[^\s<]+)/g
const LABEL_RE = /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 _/-]{1,30}):(\s|$)/

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  // **negrita** y *cursiva*
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...linkify(text.slice(last, m.index), `${keyPrefix}-t${i++}`))
    if (m[1] !== undefined) out.push(<strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-slate-900">{m[1]}</strong>)
    else out.push(<em key={`${keyPrefix}-i${i++}`}>{m[2]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(...linkify(text.slice(last), `${keyPrefix}-t${i++}`))
  return out
}

function linkify(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(URL_RE)
  return parts.map((p, i) =>
    URL_RE.test(p) && /^https?:\/\//.test(p) ? (
      <a key={`${keyPrefix}-${i}`} href={p} target="_blank" rel="noreferrer" className="break-all text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700">
        {p}
      </a>
    ) : (
      p
    ),
  )
}

function renderLine(line: string, key: string): ReactNode {
  const label = LABEL_RE.exec(line)
  if (label) {
    return (
      <>
        <span className="font-semibold text-slate-900">{label[1]}:</span>
        {renderInline(line.slice(label[0].length - label[2].length), key)}
      </>
    )
  }
  return renderInline(line, key)
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/)
  return (
    <div className={cx('space-y-2 text-sm leading-relaxed text-slate-700', className)}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-•*]\s+/.test(l))
        if (isList) {
          return (
            <ul key={bi} className="list-disc space-y-0.5 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{renderLine(l.replace(/^\s*[-•*]\s+/, ''), `${bi}-${li}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {li > 0 ? <br /> : null}
                {renderLine(l, `${bi}-${li}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

/** Textarea con botones de negrita / cursiva / lista que envuelven la selección. */
export function RichTextarea({ value, onChange, className, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const wrap = (before: string, after = before, placeholder = 'texto') => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const list = () => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const chunk = value.slice(lineStart, end)
    const lines = chunk.split('\n').map((l) => (l.trim() ? (/^\s*-\s/.test(l) ? l : `- ${l}`) : l))
    const next = value.slice(0, lineStart) + lines.join('\n') + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => el.focus())
  }

  const btn = 'inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800'

  return (
    <div className={cx('rounded-lg border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100', className)}>
      <div className="flex items-center gap-0.5 border-b border-slate-100 px-1.5 py-1">
        <button type="button" onClick={() => wrap('**')} title="Negrita (**texto**)" className={btn}>
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => wrap('*')} title="Cursiva (*texto*)" className={btn}>
          <Italic size={14} />
        </button>
        <button type="button" onClick={list} title="Lista (- elemento)" className={btn}>
          <List size={14} />
        </button>
        <span className="ml-auto pr-1 text-[11px] text-slate-400">Enter para salto de línea · línea en blanco para nuevo párrafo</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block min-h-32 w-full resize-y rounded-b-lg border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        {...rest}
      />
    </div>
  )
}
