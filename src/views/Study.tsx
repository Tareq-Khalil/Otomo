import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Head } from '@/components/Head'
import { Button } from '@/components/ui/button'
import { uid, useApp, useNow, usePersisted } from '@/lib/store'
import type { Session } from '@/lib/types'
import { iso, p2, weekStart } from '@/lib/time'

const MIN = 60_000, FOCUS = 25 * MIN, BREAK = 5 * MIN, LONG = 15 * MIN, CYCLE = 4, CIRC = 2 * Math.PI * 54
interface Run { kind: 'focus' | 'break' | 'long'; dur: number; end: number; left?: number; subj: string }
interface St { run: Run | null; log: Session[]; cyc: number; subj: string }
const init: St = { run: null, log: [], cyc: 0, subj: 'General' }

/* DEMO ONLY — these are placeholders, not real students. A live board needs a backend that verifies sessions server-side. */
const DEMO = [
  ['tls123', 'Section 20', 1850],
  ['-', 'Section 04', 1625],
  ['-', 'Section 19', 1450],
  ['-', 'Section 08', 1300],
  ['-', 'Section 21', 1125],
  ['-', 'Section 03', 975],
  ['-', 'Section 15', 825],
  ['-', 'Section 24', 650],
  ['-', 'Section 06', 475],
  ['-', 'Section 11', 300],
] as const
const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m} min`)
const clk = (ms: number) => { const s = Math.ceil(ms / 1000); return `${p2(Math.floor(s / 60))}:${p2(s % 60)}` }

export function Study() {
  const { s, data } = useApp()
  const [st, setSt] = usePersisted<St>('uh:study', init)
  const now = useNow(1000), t = now.getTime(), { run } = st

  useEffect(() => {
    setSt(o => {
      let { run: r, log, cyc } = o, ch = false
      while (r && r.left === undefined && r.end <= Date.now()) {
        ch = true
        if (r.kind === 'focus') {
          log = [{ sid: uid(), ts: r.end, m: Math.round(r.dur / MIN), subj: r.subj }, ...log].slice(0, 300)
          cyc = Math.min(CYCLE, cyc + 1)
          const d = cyc >= CYCLE ? LONG : BREAK
          r = { kind: cyc >= CYCLE ? 'long' : 'break', dur: d, end: r.end + d, subj: r.subj }
        } else { if (r.kind === 'long') cyc = 0; r = null }
      }
      return ch ? { ...o, run: r, log, cyc } : o
    })
  }, [t, setSt])

  const left = run ? (run.left ?? Math.max(0, run.end - t)) : FOCUS
  const prog = run ? 1 - left / run.dur : 0
  const brk = !!run && run.kind !== 'focus'
  const wk = iso(weekStart(now))
  const week = st.log.filter(x => iso(weekStart(new Date(x.ts))) === wk).reduce((a, x) => a + x.m, 0)
  const today = st.log.filter(x => iso(new Date(x.ts)) === iso(now)).reduce((a, x) => a + x.m, 0)
  const board = [...DEMO.map(([n, from, m]) => ({ n, from: from as string, m: m as number, me: false })), { n: s.name.split(' ')[0], from: 'you', m: week, me: true }].sort((a, b) => b.m - a.m)

  const main = () => {
    if (!run) return setSt(o => ({ ...o, cyc: o.cyc >= CYCLE ? 0 : o.cyc, run: { kind: 'focus', dur: FOCUS, end: Date.now() + FOCUS, subj: o.subj } }))
    if (brk) return setSt(o => ({ ...o, cyc: run.kind === 'long' ? 0 : o.cyc, run: null }))
    setSt(o => ({ ...o, run: run.left === undefined ? { ...run, left: Math.max(0, run.end - Date.now()) } : { ...run, end: Date.now() + run.left!, left: undefined } }))
  }

  return (
    <>
      <Head kicker="Pomodoro · 25 + 5" title="Focus." jp="集中" />
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8"><div>
      <div className="mb-6 rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="label">{run ? (run.left !== undefined ? 'Paused' : brk ? (run.kind === 'long' ? 'Long break' : 'Break') : 'Focusing') : 'Ready'}</p>
        <div className="relative mx-auto my-4 h-60 w-60">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--line)" strokeWidth="3" strokeDasharray="1 5" strokeLinecap="round" />
            <motion.circle cx="60" cy="60" r="54" fill="none" stroke={brk ? 'var(--ink)' : 'var(--accent)'} strokeWidth="4" strokeLinecap="round" strokeDasharray={CIRC}
              animate={{ strokeDashoffset: CIRC * (1 - prog) }} transition={{ duration: run ? 1 : .4, ease: 'linear' }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center"><b role="timer" className="font-display text-6xl font-light tabular-nums">{clk(left)}</b></div>
        </div>
        <div className="mb-4 flex justify-center gap-2" aria-hidden>
          {Array.from({ length: CYCLE }, (_, i) => <i key={i} className={`h-2 w-8 rounded-full ${i < st.cyc ? 'bg-accent' : i === st.cyc && run?.kind === 'focus' ? 'bg-ink' : 'bg-line'}`} />)}
        </div>
        <select value={st.subj} disabled={!!run} aria-label="Subject" onChange={e => setSt(o => ({ ...o, subj: e.target.value }))} className="mb-4 h-11 w-full rounded-md border border-line bg-bg px-3 text-base disabled:opacity-50">
          {['General', ...Object.keys(data.courses)].map(k => <option key={k}>{k}</option>)}
        </select>
        <div className="flex gap-2">
          <Button variant="accent" className="flex-1" onClick={main}>{!run ? 'Start focus' : brk ? 'Skip break' : run.left !== undefined ? 'Resume' : 'Pause'}</Button>
          {run?.kind === 'focus' && <Button variant="line" onClick={() => confirm("Cancel this session? The time won't be counted.") && setSt(o => ({ ...o, run: null }))}>Cancel</Button>}
        </div>
      </div>

      </div><div>
      <div className="mb-8 grid grid-cols-2 gap-3">
        {[['Today', fmt(today)], ['This week', fmt(week)]].map(([k, v]) => <div key={k} className="rounded-xl border border-line p-4"><b className="font-display text-3xl font-light">{v}</b><p className="label mt-1">{k}</p></div>)}
      </div>

      <h2 className="font-display text-2xl italic">Leaderboard</h2>
      <p className="label mb-3 mt-1">Demo board · placeholder names, not real students</p>
      <ol className="space-y-2">
        {board.map((r, i) => (
          <li key={`${r.from}-${r.n}`} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${r.me ? 'border-accent' : 'border-line'}`}>
            <span className="w-6 font-display text-xl italic">{i + 1}</span>
            <div className="min-w-0 flex-1"><b className="block truncate text-[15px]">{r.n}{r.me && ' (you)'}</b><span className="label">{r.from}</span></div>
            <span className="font-mono text-sm">{fmt(r.m)}</span>
          </li>
        ))}
      </ol>
      </div></div>
    </>
  )
}
