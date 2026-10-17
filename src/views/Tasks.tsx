import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Plus, Search } from 'lucide-react'
import { Head } from '@/components/Head'
import { SyncBadge } from '@/components/SyncBadge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { useApp } from '@/lib/store'
import { createTask, dueAt, fmtDay, hint, isOverdue, PRIO_RANK, removeTask, resolveConflict, restoreTask, todayStr, toggleTask, updateTask, useTasks, type Priority, type Status, type TaskRec } from '@/lib/tasks'
import { cn } from '@/lib/utils'

const PRIOS: Priority[] = ['low', 'normal', 'high', 'urgent']
const VIEWS = [['all', 'All'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Done']] as const
type ViewId = (typeof VIEWS)[number][0]
const field = 'mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-base normal-case tracking-normal'
const dot: Record<Priority, string> = { urgent: 'bg-accent', high: 'bg-gold', normal: 'bg-mute', low: 'bg-line' }

export function Tasks() {
  const { data } = useApp()
  const { tasks, ready, error } = useTasks()
  const [view, setView] = useState<ViewId>('all'), [q, setQ] = useState(''), [prio, setPrio] = useState<'any' | Priority>('any'), [cat, setCat] = useState('any'), [sort, setSort] = useState<'due' | 'prio' | 'new'>('due')
  const [sheet, setSheet] = useState<{ task?: TaskRec; seed?: string } | null>(null)
  const [title, setTitle] = useState('')
  const [undo, setUndo] = useState<string | null>(null)
  const now = new Date(), today = todayStr(now)

  useEffect(() => { // opened from a dashboard mission
    if (!ready || !hint.open) return
    const t = tasks.find(x => x.id === hint.open); hint.open = null
    if (t) setSheet({ task: t })
  }, [ready, tasks])
  useEffect(() => { if (!undo) return; const id = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(id) }, [undo])

  const cats = useMemo(() => [...new Set(['General', ...Object.keys(data.courses), ...tasks.map(t => t.category).filter((c): c is string => !!c)])], [data, tasks])
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase(), n = new Date(), td = todayStr(n)
    const key = (t: TaskRec) => dueAt(t)?.getTime() ?? Infinity
    return tasks
      .filter(t => (view === 'done' ? t.status === 'done' : view === 'today' ? t.status !== 'done' && (isOverdue(t, n) || t.dueDate === td || t.startDate === td) : view === 'upcoming' ? t.status !== 'done' && !!t.dueDate && t.dueDate > td : true))
      .filter(t => (prio === 'any' || t.priority === prio) && (cat === 'any' || (t.category ?? 'General') === cat) && (!ql || t.title.toLowerCase().includes(ql) || t.notes.toLowerCase().includes(ql)))
      .sort((a, b) => +(a.status === 'done') - +(b.status === 'done') || (sort === 'due' ? key(a) - key(b) : sort === 'prio' ? PRIO_RANK[b.priority] - PRIO_RANK[a.priority] : b.createdAt - a.createdAt) || b.createdAt - a.createdAt)
  }, [tasks, view, q, prio, cat, sort])

  const open = tasks.filter(t => t.status !== 'done').length
  const overdue = tasks.filter(t => isOverdue(t, now)).length
  const quick = (e: FormEvent) => { e.preventDefault(); const t = title.trim(); if (!t) return; createTask({ title: t }); setTitle('') }
  const sel = 'h-10 rounded-md border border-line bg-bg px-2 text-sm'

  return (
    <>
      <Head kicker={`${open} open${overdue ? ` · ${overdue} overdue` : ''}`} title="To do." jp="やること" />
      <SyncBadge className="-mt-3 mb-5" />
      {error && <p role="alert" className="label mb-4 !text-accent">This browser is blocking on-device storage, so tasks can't be saved. Turn off private browsing and reload.</p>}

      <form className="mb-4 flex gap-2" onSubmit={quick}>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Add a task. A title is all you need…" aria-label="Task title" className="h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-base" />
        <Button variant="accent" size="icon" type="submit" aria-label="Add task"><Plus size={18} /></Button>
        <Button variant="line" type="button" className="hidden sm:inline-flex" onClick={() => { setSheet({ seed: title.trim() }); setTitle('') }}>Details</Button>
      </form>
      <Button variant="line" size="sm" className="mb-4 sm:hidden" onClick={() => { setSheet({ seed: title.trim() }); setTitle('') }}>Add with details</Button>

      <div role="tablist" aria-label="Show" className="mb-3 flex gap-1.5 overflow-x-auto">
        {VIEWS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={cn('label shrink-0 rounded-full border px-3.5 py-2', view === id ? 'border-accent bg-accent !text-white' : 'border-line')}>{label}</button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <label className="relative min-w-40 flex-1"><Search size={15} className="absolute left-3 top-3 text-mute" /><span className="sr-only">Search tasks</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-base" /></label>
        <select aria-label="Priority" className={sel} value={prio} onChange={e => setPrio(e.target.value as 'any' | Priority)}><option value="any">Any priority</option>{PRIOS.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <select aria-label="Category" className={sel} value={cat} onChange={e => setCat(e.target.value)}><option value="any">Any category</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <select aria-label="Sort" className={sel} value={sort} onChange={e => setSort(e.target.value as 'due' | 'prio' | 'new')}><option value="due">By deadline</option><option value="prio">By priority</option><option value="new">Newest</option></select>
      </div>

      {ready && rows.length === 0 && <p className="label">{tasks.length === 0 ? 'Nothing here yet. Add your first task above.' : 'No tasks match these filters.'}</p>}
      <ul className="grid gap-2 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {rows.map(x => {
            const late = isOverdue(x, now), done = x.status === 'done'
            return (
              <motion.li key={x.id} layout initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }} className={cn('rounded-lg border bg-surface/60 px-3 py-3', late ? 'border-accent' : 'border-line')}>
                <div className="flex items-start gap-3">
                  <button aria-label={done ? `Reopen "${x.title}"` : `Mark "${x.title}" done`} onClick={() => toggleTask(x.id)} className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-sm border', done ? 'border-accent bg-accent text-white' : 'border-ink')}>{done && <Check size={14} strokeWidth={3} />}</button>
                  <button className={cn('min-w-0 flex-1 text-left', done && 'opacity-50')} onClick={() => setSheet({ task: x })}>
                    <span className={cn('block', done && 'line-through')}>{x.title}</span>
                    <span className="label mt-1 flex flex-wrap items-center gap-x-2">
                      <i className={cn('inline-block h-2 w-2 rounded-full', dot[x.priority])} title={`${x.priority} priority`} />
                      {x.dueDate && <span className={cn(late && '!text-accent')}>{late ? 'Overdue · ' : 'Due '}{x.dueDate === today ? 'today' : fmtDay(x.dueDate)}{x.dueTime ? ` ${x.dueTime}` : ''}</span>}
                      {x.startDate && <span>Starts {x.startDate === today ? 'today' : fmtDay(x.startDate)}{x.startTime ? ` ${x.startTime}` : ''}</span>}
                      {x.estMin && <span>{x.estMin} min</span>}
                      {x.category && <span>{x.category}</span>}
                      {x.status === 'doing' && <span className="!text-gold">In progress</span>}
                    </span>
                  </button>
                </div>
                {x.conflict && (
                  <div className="mt-3 rounded-md border border-accent p-2.5" role="group" aria-label="Sync conflict">
                    <p className="label !normal-case !tracking-normal !text-accent">Also changed on another device ({x.conflict.fields.join(', ')}). Which version should win?</p>
                    <div className="mt-2 flex gap-2"><Button size="sm" variant="line" onClick={() => resolveConflict(x.id, 'mine')}>Keep mine</Button><Button size="sm" variant="line" onClick={() => resolveConflict(x.id, 'theirs')}>Use the other</Button></div>
                  </div>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <Sheet open={!!sheet} onOpenChange={o => !o && setSheet(null)} title={sheet?.task ? 'Edit task' : 'New task'}>
        {sheet && <TaskForm task={sheet.task} seed={sheet.seed} cats={cats} onDone={() => setSheet(null)} onDelete={id => { removeTask(id); setUndo(id); setSheet(null) }} />}
      </Sheet>

      {undo && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-line bg-surface px-5 py-3 md:bottom-6">
          <span className="label">Task deleted</span>
          <button className="label !text-accent underline" onClick={() => { restoreTask(undo); setUndo(null) }}>Undo</button>
        </div>
      )}
    </>
  )
}

function TaskForm({ task, seed, cats, onDone, onDelete }: { task?: TaskRec; seed?: string; cats: string[]; onDone: () => void; onDelete: (id: string) => void }) {
  const [f, setF] = useState({
    title: task?.title ?? seed ?? '', notes: task?.notes ?? '', priority: task?.priority ?? ('normal' as Priority), status: task?.status ?? ('todo' as Status), category: task?.category ?? '',
    dueDate: task?.dueDate ?? '', dueTime: task?.dueTime ?? '', startDate: task?.startDate ?? '', startTime: task?.startTime ?? '', est: task?.estMin ? String(task.estMin) : '', remind: task?.remindMin != null ? String(task.remindMin) : ''
  })
  const [perm, setPerm] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(o => ({ ...o, [k]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const title = f.title.trim(), est = f.est ? Math.round(+f.est) : null
    if (!title) return setErr('Give the task a title.')
    if (f.dueTime && !f.dueDate) return setErr('Pick a due date to go with the due time.')
    if (f.startTime && !f.startDate) return setErr('Pick a start date to go with the start time.')
    if (est !== null && !(est >= 1 && est <= 1440)) return setErr('Estimated minutes must be between 1 and 1440.')
    if (f.remind !== '' && !(f.dueDate && f.dueTime) && !(f.startDate && f.startTime)) return setErr('Add a due time or a start time to use a reminder.')
    const p = { remindMin: f.remind === '' ? null : +f.remind, title, notes: f.notes, priority: f.priority, status: f.status, category: f.category.trim() || null, dueDate: f.dueDate || null, dueTime: f.dueDate && f.dueTime ? f.dueTime : null, startDate: f.startDate || null, startTime: f.startDate && f.startTime ? f.startTime : null, estMin: est }
    if (task) await updateTask(task.id, p); else await createTask(p)
    onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="label block">Title<input autoFocus required maxLength={120} className={field} value={f.title} onChange={set('title')} placeholder="e.g. Finish physics lab report" /></label>
      <label className="label block">Notes<textarea rows={3} maxLength={2000} className={cn(field, 'h-auto py-2')} value={f.notes} onChange={set('notes')} placeholder="Details, links, what to hand in…" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Due date<input type="date" className={field} value={f.dueDate} onChange={set('dueDate')} /></label>
        <label className="label">Due time<input type="time" className={field} value={f.dueTime} onChange={set('dueTime')} /></label>
        <label className="label">Start date<input type="date" className={field} value={f.startDate} onChange={set('startDate')} /></label>
        <label className="label">Start time<input type="time" className={field} value={f.startTime} onChange={set('startTime')} /></label>
        <label className="label">Priority<select className={field} value={f.priority} onChange={set('priority')}>{PRIOS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <label className="label">Status<select className={field} value={f.status} onChange={set('status')}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Completed</option></select></label>
        <label className="label">Category<input list="cats" maxLength={40} className={field} value={f.category} onChange={set('category')} placeholder="Optional" /><datalist id="cats">{cats.map(c => <option key={c} value={c} />)}</datalist></label>
        <label className="label">Estimate (min)<input type="number" inputMode="numeric" min={1} max={1440} className={field} value={f.est} onChange={set('est')} placeholder="Optional" /></label>
      </div>
      <label className="label block">Remind me<select className={field} value={f.remind} onChange={set('remind')}><option value="">No reminder</option><option value="0">At the time</option><option value="10">10 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option></select></label>
      {f.remind !== '' && (
        <p className="label !normal-case !tracking-normal">
          Reminders show inside Otomo while it is open.{' '}
          {perm === 'default' && <>To also get a system notification, <button type="button" className="underline" onClick={async () => setPerm(await Notification.requestPermission())}>allow notifications</button>. It only works while Otomo is running.</>}
          {perm === 'granted' && 'System notifications are on (only while Otomo is running).'}
          {perm === 'denied' && 'System notifications are blocked in this browser, so you will only see in-app reminders.'}
          {perm === 'unsupported' && 'This browser has no system notifications.'}
        </p>
      )}
      {err && <p role="alert" className="label !normal-case !tracking-normal !text-accent">{err}</p>}
      <div className="flex gap-2 pt-2">
        <Button variant="accent" type="submit" className="flex-1">{task ? 'Save' : 'Add task'}</Button>
        {task && <Button variant="line" type="button" onClick={() => onDelete(task.id)}>Delete</Button>}
      </div>
    </form>
  )
}
