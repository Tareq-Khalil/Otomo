import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { Head } from '@/components/Head'
import { Ticket } from '@/components/Ticket'
import { Tri } from '@/components/Tri'
import { eventsOn, info, nextClass } from '@/lib/schedule'
import { Missions } from '@/components/Missions'
import { useTasks } from '@/lib/tasks'
import { useApp, useNow } from '@/lib/store'
import { clock, dur, mins } from '@/lib/time'
import type { View } from '@/App'

// [romaji, English, Japanese]: the heading uses the romaji, the small lines keep English and Japanese
const greet = (h: number): [string, string, string] =>
  h < 5 ? ['Konbanwa', 'Good evening', 'こんばんは']
  : h < 12 ? ['Ohayō', 'Good morning', 'おはよう']
  : h < 18 ? ['Konnichiwa', 'Good afternoon', 'こんにちは']
  : ['Konbanwa', 'Good evening', 'こんばんは']
const R = 26, C = 2 * Math.PI * R
const list = { show: { transition: { staggerChildren: .06 } } }

export function Home({ go }: { go: (v: View) => void }) {
  const { s, data } = useApp()
  const n = useNow(30_000), nm = n.getHours() * 60 + n.getMinutes()
  const nx = nextClass(s, data, n), today = eventsOn(s, data, n)
  const open = useTasks().tasks.filter(t => t.status !== 'done').length
  const [hello, helloEn, helloJp] = greet(n.getHours())
  const pct = nx?.now ? (nm - mins(nx.e.start)) / (mins(nx.e.end) - mins(nx.e.start)) : 0
  let marked = false

  // hero card tilts toward the pointer
  const mx = useMotionValue(0), my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-.5, .5], [5, -5]), { stiffness: 200, damping: 20 })
  const ry = useSpring(useTransform(mx, [-.5, .5], [-7, 7]), { stiffness: 200, damping: 20 })

  return (
    <>
      <Head
        kicker={`${helloEn} · ${helloJp} · ${n.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        title={`${hello}, ${s.name}.`}
      />
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-8">
        <div>
          <motion.button
            onClick={() => go('schedule')} whileTap={{ scale: .98 }}
            onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - .5); my.set((e.clientY - r.top) / r.height - .5) }}
            onPointerLeave={() => { mx.set(0); my.set(0) }}
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
            className="relative mb-6 block w-full overflow-hidden rounded-3xl border border-gold/30 bg-surface p-5 text-left"
          >
            {nx?.now && <i className="rays" aria-hidden />}
            <i className="tone" aria-hidden />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="label !text-gold">
                  {nx ? (nx.now ? <Tri r="Ima" en="Happening now" jp="放送中" /> : <Tri r="Tsugi" en="Up next" jp="次回予告" />) : 'Nothing scheduled'}
                </span>
                <ArrowUpRight size={18} className="text-mute" />
              </div>
              {nx ? (
                <div className="mt-3 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-3xl font-semibold leading-tight">{info(data, nx.e.course).name}</h2>
                    <p className="label mt-3">{[nx.e.title, `${clock(nx.e.start)} – ${clock(nx.e.end)}`, nx.e.room].filter(Boolean).join(' · ')}</p>
                    <p className="mt-3 font-mono text-sm text-accent">
                      {nx.now ? `ends in ${dur(mins(nx.e.end) - nm)}` : nx.i === 0 ? `in ${dur(mins(nx.e.start) - nm)}` : nx.i === 1 ? <>Ashita · tomorrow <span className="jp">明日</span></> : nx.d.toLocaleDateString('en-GB', { weekday: 'long' })}
                    </p>
                  </div>
                  {nx.now && (
                    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90" aria-hidden>
                      <circle cx="32" cy="32" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
                      <motion.circle cx="32" cy="32" r={R} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C}
                        initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 1, ease: 'easeOut' }} />
                    </svg>
                  )}
                </div>
              ) : (
                <><h2 className="mt-3 font-display text-3xl italic">Yasumi. <span className="jp text-lg not-italic">休み</span></h2><p className="label mt-2">Enjoy the break</p></>
              )}
            </div>
          </motion.button>

          <div className="mb-8 grid grid-cols-2 gap-3">
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: .97 }} onClick={() => go('tasks')} className="rounded-2xl border border-line bg-surface/60 p-4 text-left">
              <span className="font-display text-4xl font-light">{open}</span>
              <p className="label mt-1"><Tri r="Yarukoto" en="open tasks" jp="やること" /></p>
            </motion.button>
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: .97 }} onClick={() => go('study')} className="rounded-2xl border border-line bg-surface/60 p-4 text-left">
              <span className="font-display text-4xl font-light italic">25′</span>
              <p className="label mt-1"><Tri r="Shūchū" en="start a focus round" jp="集中" /></p>
            </motion.button>
          </div>
          <Missions go={go} />
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl italic">
              Kyō <span className="label not-italic">Today</span> <span className="jp text-sm not-italic">今日</span>
            </h2>
            <span className="label">{today.length ? `${today.length} ${today.length > 1 ? 'classes' : 'class'}` : ''}</span>
          </div>
          <motion.div variants={list} initial="hidden" animate="show" className="space-y-3">
            {today.length === 0 && <p className="label py-6"><Tri r="Jugyō nashi" en="No classes today" jp="授業なし" /></p>}
            {today.map((e, i) => {
              const st = nm >= mins(e.end) ? 'done' : nm >= mins(e.start) ? 'now' : !marked ? (marked = true, 'next') : ''
              return <Ticket key={e.course + e.start} e={e} state={st} i={i} onClick={() => go('schedule')} />
            })}
          </motion.div>
        </div>
      </div>
    </>
  )
}
