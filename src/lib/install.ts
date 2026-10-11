import { useEffect, useState } from 'react'

interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// the browser fires this once, early, so it is caught at module load rather than inside a component
let deferred: InstallEvent | null = null
const subs = new Set<() => void>()
const notify = () => subs.forEach(f => f())

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallEvent; notify() })
window.addEventListener('appinstalled', () => { deferred = null; notify() })

const KEY = 'uh:install-dismissed', DAYS = 3
const ua = navigator.userAgent
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isAndroid = /Android/.test(ua)
export const isInApp = /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|Line\/|MicroMessenger/i.test(ua)
const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function useInstall() {
  const [, tick] = useState(0)
  const [hidden, setHidden] = useState(() => {
    try { return Date.now() - +(localStorage.getItem(KEY) ?? 0) < DAYS * 864e5 } catch { return false }
  })
  useEffect(() => {
    const f = () => tick(n => n + 1)
    subs.add(f)
    return () => { subs.delete(f) }
  }, [])

  return {
    show: (isIOS || isAndroid) && !standalone() && !hidden,
    canPrompt: !!deferred,
    async install() {
      if (!deferred) return false
      const e = deferred; deferred = null
      await e.prompt()
      const r = await e.userChoice
      notify()
      return r.outcome === 'accepted'
    },
    dismiss() {
      try { localStorage.setItem(KEY, String(Date.now())) } catch { /* private mode */ }
      setHidden(true)
    }
  }
}