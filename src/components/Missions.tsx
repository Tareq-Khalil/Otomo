import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Tri } from '@/components/Tri'
import { createTask, hint, isOverdue, todayStr, toggleTask, useTasks } from '@/lib/tasks'
import { useNow } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { View } from '@/App'

/** today's missions: overdue first, then anything due or planned for today */
export function Missions({ go }: { go: (v: View) => void }) {
  const { tasks, ready } = useTasks()
  const now = useNow(60_000), today = todayStr(now)
  const [title, setTitle] = useState('')
  const list = useMemo(() =>
    tasks.filter(t => t.status !== 'done' && (isOverdue(t, now) || t.dueDate === today || t.startDate === today))
      .sort((a, b) => +isOverdue(b, now) - +isOverdue(a, now) || (a.dueTime ?? a.startTime ?? '99:99').localeCompare(b.dueTime ?? b.startTime ?? '99:99'))
  , [tasks, now, today])
  const add = () => { const t = title.trim(); if (!t) return; createTask({ title: t, dueDate: today }); setTitle('') }
  return (
    <section className="mb-8" aria-label="Today's missions">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-2xl italic">Misshon <span className="label not-italic">Missions</span> <span className="jp text-sm not-italic">任務</span></h2>
        <button className="label underline underline-offset-2" onClick={() => go('tasks')}>All tasks</button>
      </div>
      <ul className="space-y-2">
        {ready && list.length === 0 && <li className="label"><Tri r="Nanimo nai" en="nothing due today" jp="なし" /></li>}
        {list.slice(0, 6).map(t => {
          const late = isOverdue(t, now)
          return (
            <li key={t.id} className={cn('flex items-center gap-3 rounded-lg border bg-surface/60 px-3 py-2.5', late ? 'border-accent' : 'border-line')}>
              <button aria-label={`Mark "${t.title}" done`} onClick={() => toggleTask(t.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-ink"><Check size={14} strokeWidth={3} className="opacity-0" /></button>
              <button className="min-w-0 flex-1 text-left" onClick={() => { hint.open = t.id; go('tasks') }}>
                <span className="block truncate">{t.title}</span>
                <span className={cn('label', late && '!text-accent')}>{late ? 'Overdue' : t.dueTime ? `Due ${t.dueTime}` : t.startTime ? `Starts ${t.startTime}` : 'Today'}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); add() }}>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Add a task for today…" aria-label="New task for today" className="h-10 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-base" />
        <button type="submit" aria-label="Add task" className="grid h-10 w-10 place-items-center rounded-md bg-accent text-white"><Plus size={18} /></button>
      </form>
    </section>
  )
}
