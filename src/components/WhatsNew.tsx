import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { NOTES, VERSION } from '@/lib/version'

const SEEN = 'uh:seen-version'
const read = () => { try { return localStorage.getItem(SEEN) } catch { return VERSION } }
// brand-new installs never see the announcement; people who already had Otomo see it once per version
try {
  const s = JSON.parse(localStorage.getItem('uh:state') ?? 'null')
  if (!localStorage.getItem(SEEN) && !(s && s.name)) localStorage.setItem(SEEN, VERSION)
} catch { /* storage blocked */ }

export function WhatsNew() {
  const [open, setOpen] = useState(() => read() !== VERSION)
  const close = () => { try { localStorage.setItem(SEEN, VERSION) } catch { /* ignore */ } setOpen(false) }
  return (
    <Sheet open={open} onOpenChange={o => !o && close()} title="What's new">
      <p className="label mb-3">Otomo {VERSION} <span className="jp">新バージョン</span></p>
      <ul className="mb-5 list-disc space-y-2 pl-5 text-sm">{NOTES.map(n => <li key={n}>{n}</li>)}</ul>
      <Button variant="accent" className="w-full" onClick={close}>Got it</Button>
    </Sheet>
  )
}
