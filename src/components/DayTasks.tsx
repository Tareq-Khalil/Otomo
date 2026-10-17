import { Check } from 'lucide-react'
import { hint, toggleTask, useTasks } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import type { View } from '@/App'

const hm = (t: string, add: number) => { const [h, m] = t.split(':').map(Number), x = h * 60 + m + add; return `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }

export function DayTasks({ date, go }: { date: string; go: (v: View) => void }) {
  const { tasks } = useTasks()
  const planned = tasks.filter(t => t.startDate === date).sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99'))
  const due = tasks.filter(t => t.dueDate === date && t.startDate !== date).sort((a, b) => (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99'))
  if (!planned.length && !due.length) return null
  const row = (t: (typeof tasks)[number], when: string) => (
    <li key={t.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface/60 px-3 py-2.5">
      <button aria-label={t.status === 'done' ? `Reopen "${t.title}"` : `Mark "${t.title}" done`} onClick={() => toggleTask(t.id)} className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-sm border', t.status === 'done' ? 'border-accent bg-accent text-white' : 'border-ink')}>{t.status === 'done' && <Check size={14} strokeWidth={3} />}</button>
      <button className={cn('min-w-0 flex-1 text-left', t.status === 'done' && 'opacity-50')} onClick={() => { hint.open = t.id; go('tasks') }}>
        <span className={cn('block truncate', t.status === 'done' && 'line-through')}>{t.title}</span><span className="label">{when}</span>
      </button>
    </li>
  )
  return (
    <section className="mt-6" aria-label="Tasks on this day">
      {planned.length > 0 && <><p className="label mb-2">Planned <span className="jp">予定タスク</span></p>
        <ul className="mb-4 grid gap-2 md:grid-cols-2">{planned.map(t => row(t, t.startTime ? (t.estMin ? `${t.startTime} – ${hm(t.startTime, t.estMin)}` : `from ${t.startTime}`) : 'sometime that day'))}</ul></>}
      {due.length > 0 && <><p className="label mb-2">Due <span className="jp">締切</span></p>
        <ul className="grid gap-2 md:grid-cols-2">{due.map(t => row(t, t.dueTime ? `by ${t.dueTime}` : 'by end of day'))}</ul></>}
    </section>
  )
}
