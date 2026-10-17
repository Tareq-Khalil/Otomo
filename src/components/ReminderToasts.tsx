import { Bell, X } from 'lucide-react'
import { hint } from '@/lib/tasks'
import type { Reminder } from '@/lib/reminders'
import type { View } from '@/App'

export function ReminderToasts({ items, dismiss, go }: { items: Reminder[]; dismiss: (k: string) => void; go: (v: View) => void }) {
  if (!items.length) return null
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 top-[calc(.75rem+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-sm flex-col gap-2 md:left-auto md:right-6 md:mx-0">
      {items.map(r => (
        <div key={r.key} className="flex items-center gap-3 rounded-xl border border-accent bg-surface p-3 shadow-xl">
          <Bell size={18} className="shrink-0 text-accent" />
          <button className="min-w-0 flex-1 text-left" onClick={() => { hint.open = r.id; go('tasks'); dismiss(r.key) }}>
            <b className="block truncate">{r.title}</b>
            <span className="label">{r.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · tap to open</span>
          </button>
          <button aria-label="Dismiss reminder" className="text-mute" onClick={() => dismiss(r.key)}><X size={16} /></button>
        </div>
      ))}
    </div>
  )
}
