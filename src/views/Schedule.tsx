import { useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Head } from '@/components/Head'
import { Ticket } from '@/components/Ticket'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { eventsOn, info, type Row } from '@/lib/schedule'
import { uid, useApp } from '@/lib/store'
import { addDays, clock, iso, mins, weekStart } from '@/lib/time'
import { cn } from '@/lib/utils'
import { DayTasks } from '@/components/DayTasks'
import type { View } from '@/App'

export function Schedule({ go }: { go: (v: View) => void }) {
  const { s, set, data } = useApp()
  const [sel, setSel] = useState(() => new Date())
  const [adding, setAdding] = useState(false)
  const [detail, setDetail] = useState<Row | null>(null)
  const ws = weekStart(sel), days = Array.from({ length: 7 }, (_, i) => addDays(ws, i)), evs = eventsOn(s, data, sel)
  const today = iso(new Date())

  return (
    <>
      <Head kicker={sel.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} title="This week." jp="今週" />
      <div className="mb-5 flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Previous week" onClick={() => setSel(addDays(sel, -7))}><ChevronLeft size={18} /></Button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map(d => {
            const on = iso(d) === iso(sel)
            return (
              <button key={iso(d)} onClick={() => setSel(d)} className="relative grid place-items-center rounded-md py-2">
                {on && <motion.span layoutId="day" className="absolute inset-0 rounded-md bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
                <span className={cn('label relative !text-[9px]', on && '!text-bg/70')}>{d.toLocaleDateString('en', { weekday: 'short' })}</span>
                <b className={cn('relative font-display text-lg', on ? 'text-bg' : iso(d) === today && 'text-accent')}>{d.getDate()}</b>
              </button>
            )
          })}
        </div>
        <Button variant="ghost" size="icon" aria-label="Next week" onClick={() => setSel(addDays(sel, 7))}><ChevronRight size={18} /></Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="label">{evs.length ? `${evs.length} ${evs.length > 1 ? 'classes' : 'class'} · ${clock(evs[0].start)} – ${clock(evs.reduce((a, e) => (mins(e.end) > mins(a) ? e.end : a), evs[0].end))}` : 'No classes'}</p>
        <Button variant="line" size="sm" onClick={() => setAdding(true)}><Plus size={14} /> Event</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {evs.map((e, i) => <Ticket key={sel.toDateString() + e.course + e.start} e={e} i={i} onClick={() => setDetail(e)} />)}
      </div>

      <DayTasks date={iso(sel)} go={go} />

      <AddEvent open={adding} onClose={() => setAdding(false)} date={iso(sel)} />
      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)} title={detail ? (detail.own ? detail.course : info(data, detail.course).name) : ''}>
        {detail && (
          <>
            <dl className="space-y-3">
              {([['Time', `${clock(detail.start)} – ${clock(detail.end)}`], ['Type', detail.title], ['Room', detail.room || 'Not announced yet'], ['Staff', detail.staff || 'Not listed yet']] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-b border-line pb-2"><dt className="label">{k}</dt><dd className="text-right text-sm">{v}</dd></div>
              ))}
            </dl>
            {detail.own && (
              <Button variant="line" className="mt-5 w-full" onClick={() => { set({ mine: s.mine.filter(m => m.id !== detail.own!.id) }); setDetail(null) }}><Trash2 size={14} /> Delete event</Button>
            )}
          </>
        )}
      </Sheet>
    </>
  )
}

function AddEvent({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const { s, set } = useApp()
  const [f, setF] = useState({ course: '', date, start: '14:00', end: '15:00' })
  const bad = !f.course.trim() || mins(f.end) <= mins(f.start)
  const field = 'mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-base'
  return (
    <Sheet open={open} onOpenChange={o => { if (o) setF(x => ({ ...x, date })); else onClose() }} title="New event">
      <div className="space-y-3">
        <label className="label block">Title<input className={field} maxLength={60} value={f.course} onChange={e => setF({ ...f, course: e.target.value })} /></label>
        <label className="label block">Date<input type="date" className={field} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="label block">Start<input type="time" className={field} value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label>
          <label className="label block">End<input type="time" className={field} value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></label>
        </div>
        <p className="label">Between 8:00 AM and 10:00 PM</p>
        <Button variant="accent" className="w-full" disabled={bad} onClick={() => { set({ mine: [...s.mine, { id: uid(), course: f.course.trim(), title: 'Personal', date: f.date, start: f.start, end: f.end }] }); setF({ ...f, course: '' }); onClose() }}>Add to schedule</Button>
      </div>
    </Sheet>
  )
}
