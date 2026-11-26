import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { NOTES, VERSION } from '@/lib/version'

const SEEN = 'uh:seen-version'
const read = () => { try { return localStorage.getItem(SEEN) } catch { return VERSION } }
try {
  const s = JSON.parse(localStorage.getItem('uh:state') ?? 'null')
  if (!localStorage.getItem(SEEN) && !(s && s.name)) localStorage.setItem(SEEN, VERSION)
} catch {  }

export function WhatsNew() {
  const [open, setOpen] = useState(() => read() !== VERSION)
  const close = () => { try { localStorage.setItem(SEEN, VERSION) } catch { /* ignore */ } setOpen(false) }
  return (
    <Sheet open={open} onOpenChange={o => !o && close()} title="A new chapter">
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_55%)] p-5">
        <div className="absolute right-3 top-3 flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 text-accent/60">
          <Sparkles size={24} />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Otomo {VERSION}</p>
        <h3 className="mt-2 max-w-[14rem] font-display text-3xl font-semibold leading-tight italic">Small update.<br />Serious upgrades.</h3>
        <p className="jp mt-2 text-sm">アップデート 4.1.0</p>
      </div>
      <div className="mb-5 space-y-2.5">
        {NOTES.map((note, index) => (
          <div key={note} className="flex gap-3 rounded-xl border border-line bg-bg/50 px-3 py-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-white">
              <Check size={12} strokeWidth={3} />
            </span>
            <p className="text-sm leading-relaxed text-ink/90">{note}</p>
          </div>
        ))}
      </div>
      <Button variant="accent" className="h-11 w-full rounded-xl" onClick={close}>Start exploring</Button>
    </Sheet>
  )
}
