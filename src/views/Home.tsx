import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { Head } from '@/components/Head'
import { Ticket } from '@/components/Ticket'
import { eventsOn, info, nextClass } from '@/lib/schedule'
import { useApp, useNow } from '@/lib/store'
import { clock, dur, mins } from '@/lib/time'
import type { View } from '@/App'

const greet = (h: number) => (h < 5 ? 'Hello' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')

export function Home({ go }: { go: (v: View) => void }) {
  const { s, data } = useApp()
  const n = useNow(30_000), nm = n.getHours() * 60 + n.getMinutes()
  const nx = nextClass(s, data, n), today = eventsOn(s, data, n)
  const open = s.tasks.filter(t => !t.done).length
  let marked = false

  return (
    <>
      <Head kicker={n.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} title={`${greet(n.getHours())}, ${s.name}.`} />

      <motion.button onClick={() => go('schedule')} whileTap={{ scale: .98 }} className="relative mb-6 block w-full overflow-hidden rounded-xl bg-ink p-5 text-left text-bg">
        <div className="flex items-center justify-between">
          <span className="label !text-bg/60">{nx ? (nx.now ? 'Happening now' : 'Up next') : 'Nothing scheduled'}</span>
          <ArrowUpRight size={18} />
        </div>
        {nx ? (
          <>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">{info(data, nx.e.course).name}</h2>
            <p className="label mt-3 !text-bg/70">
              {[nx.e.title, `${clock(nx.e.start)} – ${clock(nx.e.end)}`, nx.e.room].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-4 font-mono text-sm text-accent">
              {nx.now ? `ends in ${dur(mins(nx.e.end) - nm)}` : nx.i === 0 ? `in ${dur(mins(nx.e.start) - nm)}` : nx.i === 1 ? 'tomorrow' : nx.d.toLocaleDateString('en-GB', { weekday: 'long' })}
            </p>
            {nx.now && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-bg/15">
                <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${((nm - mins(nx.e.start)) / (mins(nx.e.end) - mins(nx.e.start))) * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
              </div>
            )}
          </>
        ) : <h2 className="mt-3 font-display text-3xl italic">Enjoy the break.</h2>}
      </motion.button>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <button onClick={() => go('tasks')} className="rounded-xl border border-line p-4 text-left">
          <span className="font-display text-4xl font-light">{open}</span>
          <p className="label mt-1">open tasks</p>
        </button>
        <button onClick={() => go('study')} className="rounded-xl border border-line p-4 text-left">
          <span className="font-display text-4xl font-light italic">25′</span>
          <p className="label mt-1">start a focus round</p>
        </button>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-2xl italic">Today</h2>
        <span className="label">{today.length ? `${today.length} ${today.length > 1 ? 'classes' : 'class'}` : ''}</span>
      </div>
      <div className="space-y-3">
        {today.length === 0 && <p className="label py-6">No classes today.</p>}
        {today.map((e, i) => {
          const st = nm >= mins(e.end) ? 'done' : nm >= mins(e.start) ? 'now' : !marked ? (marked = true, 'next') : ''
          return <Ticket key={e.course + e.start} e={e} state={st} i={i} onClick={() => go('schedule')} />
        })}
      </div>
    </>
  )
}
