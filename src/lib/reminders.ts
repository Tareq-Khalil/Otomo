import { useEffect, useRef, useState } from 'react'
import { isOwnerReady, listTasks, type Fields } from './tasks'

/** the moment a task is "at": its planned start if it has a start time, otherwise its deadline; never invented */
export function targetOf(t: Pick<Fields, 'dueDate' | 'dueTime' | 'startDate' | 'startTime'>): Date | null {
  const p = t.startDate && t.startTime ? [t.startDate, t.startTime] : t.dueDate && t.dueTime ? [t.dueDate, t.dueTime] : null
  if (!p) return null
  const [y, m, d] = p[0].split('-').map(Number), [h, mi] = p[1].split(':').map(Number)
  return new Date(y, m - 1, d, h, mi)
}
export interface Reminder { key: string; id: string; title: string; at: Date }
const FIRED = 'uh:reminded'
const STALE = 2 * 3600_000   // a reminder more than 2 h past its time is not worth showing when the app reopens
const load = (): string[] => { try { const a = JSON.parse(localStorage.getItem(FIRED) ?? '[]'); return Array.isArray(a) ? a : [] } catch { return [] } }

async function notifyOS(title: string, body: string, tag: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png' })
    else new Notification(title, { body, tag })
  } catch { /* the in-app reminder still shows */ }
}

/** checks every 20 s while Otomo is open; each reminder fires once (re-arms if the task's time or lead time changes) */
export function useReminders() {
  const [items, setItems] = useState<Reminder[]>([])
  const fired = useRef<string[]>(load())
  useEffect(() => {
    let on = true
    const tick = async () => {
      if (!isOwnerReady()) return
      let ts
      try { ts = await listTasks() } catch { return }
      const now = Date.now(), fresh: Reminder[] = []
      for (const t of ts) {
        if (t.deletedAt || t.status === 'done' || t.remindMin == null) continue
        const at = targetOf(t); if (!at) continue
        const key = `${t.id}:${at.getTime()}:${t.remindMin}`
        if (now < at.getTime() - t.remindMin * 60_000 || now > at.getTime() + STALE || fired.current.includes(key)) continue
        fired.current.push(key); fresh.push({ key, id: t.id, title: t.title, at })
      }
      if (!fresh.length || !on) return
      fired.current = fired.current.slice(-200)
      try { localStorage.setItem(FIRED, JSON.stringify(fired.current)) } catch { /* private mode */ }
      setItems(o => [...o, ...fresh])
      for (const r of fresh) notifyOS('Otomo reminder', `${r.title} · ${r.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, r.key)
    }
    const first = setTimeout(tick, 3000), id = setInterval(tick, 20_000)
    return () => { on = false; clearTimeout(first); clearInterval(id) }
  }, [])
  return { items, dismiss: (key: string) => setItems(o => o.filter(x => x.key !== key)) }
}
