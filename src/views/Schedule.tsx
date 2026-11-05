import { useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, GraduationCap, MapPin, Plus, Trash2 } from 'lucide-react'
import { Head } from '@/components/Head'
import { Ticket } from '@/components/Ticket'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { eventsOn, info, type Row } from '@/lib/schedule'
import { useApp } from '@/lib/store'
import { addDays, clock, iso, mins, weekStart } from '@/lib/time'
import { cn } from '@/lib/utils'
import { DayTasks } from '@/components/DayTasks'
import { useEvents, createEvent, removeEvent } from '@/lib/events'
import { useExams, isMidtermWeek, getRoomForCode } from '@/lib/exams'
import type { View } from '@/App'

export function Schedule({ go }: { go: (v: View) => void }) {
  const { s, set, data } = useApp()
  const [sel, setSel] = useState(() => new Date())
  const [adding, setAdding] = useState(false)
  const [detail, setDetail] = useState<Row | null>(null)

  // Load IndexedDB events & Exam Schedule for student's faculty & level
  const { events: dbEvents } = useEvents()
  const { examData } = useExams(s.faculty || 'foe', s.level || 1)

  const ws = weekStart(sel)
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const evs = eventsOn(s, data, sel, dbEvents, examData)
  const today = iso(new Date())
  const selIso = iso(sel)
  const inMidterm = isMidtermWeek(examData, selIso)

  return (
    <>
      <Head kicker={sel.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} title="This week." jp="今週" />

      {/* Week Navigator */}
      <div className="mb-4 flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Previous week" onClick={() => setSel(addDays(sel, -7))}>
          <ChevronLeft size={18} />
        </Button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map(d => {
            const on = iso(d) === selIso
            const dayMidterm = isMidtermWeek(examData, iso(d))
            return (
              <button
                key={iso(d)}
                onClick={() => setSel(d)}
                className="relative grid place-items-center rounded-md py-2"
              >
                {on && (
                  <motion.span
                    layoutId="day"
                    className="absolute inset-0 rounded-md bg-ink"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <span className={cn('label relative !text-[9px]', on && '!text-bg/70')}>
                  {d.toLocaleDateString('en', { weekday: 'short' })}
                </span>
                <b className={cn('relative font-display text-lg', on ? 'text-bg' : iso(d) === today && 'text-accent')}>
                  {d.getDate()}
                </b>
                {dayMidterm && (
                  <span className={cn('absolute -bottom-1 h-1 w-1 rounded-full', on ? 'bg-gold' : 'bg-gold/80')} />
                )}
              </button>
            )
          })}
        </div>
        <Button variant="ghost" size="icon" aria-label="Next week" onClick={() => setSel(addDays(sel, 7))}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Midterm notice banner if looking at midterm week */}
      {inMidterm && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-ink">
          <GraduationCap size={18} className="shrink-0 text-gold" />
          <div className="min-w-0">
            <span className="font-semibold block text-gold">Midterm Examination Week (No Regular Classes)</span>
            <span className="text-[11px] text-mute">
              Exam halls are in Building 18. Rooms are personalized based on your student code ({s.code || 'Not set'}).
            </span>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between">
        <p className="label">
          {evs.length
            ? `${evs.length} ${evs.length > 1 ? (inMidterm ? 'exams & events' : 'classes') : inMidterm ? 'exam/event' : 'class'} · ${clock(evs[0].start)} – ${clock(
                evs.reduce((a, e) => (mins(e.end) > mins(a) ? e.end : a), evs[0].end)
              )}`
            : inMidterm
            ? 'No exams today'
            : 'No classes'}
        </p>
        <Button variant="line" size="sm" onClick={() => setAdding(true)}>
          <Plus size={14} /> Event
        </Button>
      </div>

      {/* Tickets List */}
      <div className="grid gap-3 md:grid-cols-2">
        {evs.map((e, i) => (
          <Ticket
            key={sel.toDateString() + e.course + e.start}
            e={e}
            i={i}
            onClick={() => setDetail(e)}
          />
        ))}
        {evs.length === 0 && (
          <div className="col-span-full py-8 text-center rounded-2xl border border-line/60 bg-surface/30">
            <p className="label">{inMidterm ? 'No examination scheduled for this day.' : 'Free day · No classes scheduled.'}</p>
          </div>
        )}
      </div>

      <DayTasks date={selIso} go={go} />

      <AddEvent open={adding} onClose={() => setAdding(false)} date={selIso} />

      {/* Event Details Sheet */}
      <Sheet
        open={!!detail}
        onOpenChange={o => !o && setDetail(null)}
        title={detail ? (detail.isExam ? `${detail.course} Midterm Exam` : (detail.own || detail.ownEventId ? detail.course : info(data, detail.course).name)) : ''}
      >
        {detail && (
          <>
            <dl className="space-y-3 pt-1">
              {([
                ['Time', `${clock(detail.start)} – ${clock(detail.end)}`],
                ['Type', detail.title],
                ...(detail.subtitle ? [['Topic', detail.subtitle]] : []),
                ['Room / Hall', detail.room || 'Not announced yet'],
                ['Staff / Instructor', detail.staff || 'Not listed yet']
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-b border-line pb-2">
                  <dt className="label">{k}</dt>
                  <dd className="text-right text-sm text-ink">{v}</dd>
                </div>
              ))}

              {detail.isExam && (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 mt-3 text-xs text-mute space-y-1">
                  <p className="text-ink font-medium flex items-center gap-1.5">
                    <MapPin size={14} className="text-gold" /> Examination Location: Building 18
                  </p>
                  <p>
                    Your room was determined by your student code: <span className="font-mono text-ink font-semibold">{s.code || 'None'}</span>.
                  </p>
                  <p className="text-[11px]">
                    Be present 15 minutes before 09:00 AM with your university ID card.
                  </p>
                </div>
              )}
            </dl>

            {detail.ownEventId && (
              <Button
                variant="line"
                className="mt-5 w-full text-accent hover:bg-accent/10"
                onClick={async () => {
                  await removeEvent(detail.ownEventId!)
                  setDetail(null)
                }}
              >
                <Trash2 size={14} className="mr-1.5" /> Delete personal event
              </Button>
            )}

            {detail.own && (
              <Button
                variant="line"
                className="mt-5 w-full text-accent hover:bg-accent/10"
                onClick={() => {
                  set({ mine: s.mine.filter(m => m.id !== detail.own!.id) })
                  setDetail(null)
                }}
              >
                <Trash2 size={14} className="mr-1.5" /> Delete personal event
              </Button>
            )}
          </>
        )}
      </Sheet>
    </>
  )
}

function AddEvent({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const [f, setF] = useState({ course: '', date, start: '14:00', end: '15:00' })
  const bad = !f.course.trim() || mins(f.end) <= mins(f.start)
  const field = 'mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-base text-ink'

  const handleCreate = async () => {
    if (bad) return
    await createEvent({
      title: f.course.trim(),
      date: f.date,
      startTime: f.start,
      endTime: f.end
    })
    setF(x => ({ ...x, course: '' }))
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={o => {
        if (o) setF(x => ({ ...x, date }))
        else onClose()
      }}
      title="New Personal Event"
    >
      <div className="space-y-3 pt-1">
        <label className="label block">
          Title
          <input
            className={field}
            maxLength={60}
            placeholder="e.g. Study Group, Lab Prep, Project Meeting"
            value={f.course}
            onChange={e => setF({ ...f, course: e.target.value })}
          />
        </label>
        <label className="label block">
          Date
          <input
            type="date"
            className={field}
            value={f.date}
            onChange={e => setF({ ...f, date: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="label block">
            Start
            <input
              type="time"
              className={field}
              value={f.start}
              onChange={e => setF({ ...f, start: e.target.value })}
            />
          </label>
          <label className="label block">
            End
            <input
              type="time"
              className={field}
              value={f.end}
              onChange={e => setF({ ...f, end: e.target.value })}
            />
          </label>
        </div>
        <p className="label">Saved locally &amp; synced across devices when signed in</p>
        <Button
          variant="accent"
          className="w-full"
          disabled={bad}
          onClick={handleCreate}
        >
          Add to schedule
        </Button>
      </div>
    </Sheet>
  )
}
