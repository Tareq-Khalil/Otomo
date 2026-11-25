import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-line bg-bg">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-[10px] font-mono text-mute">
        <span>{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-mute hover:text-ink"
          aria-label="Copy code"
        >
          {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code
          key={i}
          className="rounded border border-line/70 bg-bg px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
        >
          {tok.slice(1, -1)}
        </code>
      )
    }
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return <strong key={i} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return <em key={i} className="italic">{tok.slice(1, -1)}</em>
    }
    return tok
  })
}

export function ChatMarkdown({ content }: { content: string }) {
  const segments = content.split(/(```[\w-]*\n[\s\S]*?```)/g)

  return (
    <div className="space-y-2 break-words font-sans text-sm leading-relaxed sm:text-base">
      {segments.map((seg, idx) => {
        if (seg.startsWith('```') && seg.endsWith('```')) {
          const firstNewline = seg.indexOf('\n')
          const lang = firstNewline > 3 ? seg.slice(3, firstNewline).trim() : ''
          const code = firstNewline !== -1 ? seg.slice(firstNewline + 1, -3).replace(/\n$/, '') : seg.slice(3, -3)
          return <CodeBlock key={idx} lang={lang} code={code} />
        }

        const lines = seg.split('\n')
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, li) => {
              const trimmed = line.trim()
              if (!trimmed) return <div key={li} className="h-1" />
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={li} className="pt-1 font-display text-sm font-semibold text-ink sm:text-base">
                    {renderInline(trimmed.slice(4))}
                  </h4>
                )
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={li} className="pt-1 font-display text-base font-semibold text-ink sm:text-lg">
                    {renderInline(trimmed.slice(3))}
                  </h3>
                )
              }
              if (/^[•\-*]\s+/.test(trimmed)) {
                return (
                  <div key={li} className="flex items-start gap-2 pl-1">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="min-w-0 flex-1">{renderInline(trimmed.replace(/^[•\-*]\s+/, ''))}</span>
                  </div>
                )
              }
              const numMatch = trimmed.match(/^(\d+\.)\s+(.+)$/)
              if (numMatch) {
                return (
                  <div key={li} className="flex items-start gap-2 pl-1">
                    <span className="shrink-0 font-mono text-xs font-semibold text-accent">{numMatch[1]}</span>
                    <span className="min-w-0 flex-1">{renderInline(numMatch[2])}</span>
                  </div>
                )
              }
              return <p key={li}>{renderInline(line)}</p>
            })}
          </div>
        )
      })}
    </div>
  )
}
