import { useState } from 'react'
import { Head } from '@/components/Head'
import { Ticket } from '@/components/Ticket'
import { forSection } from '@/lib/schedule'
import { useApp } from '@/lib/store'
import { DOW, mins, secsOf } from '@/lib/time'
import { cn } from '@/lib/utils'

const order = [6, 0, 1, 2, 3, 4, 5]
const sel = 'h-11 w-full rounded-md border border-line bg-bg px-3 text-base'

export function Others() {
  const { s, data } = useApp()
  const [g, setG] = useState(s.group), [sec, setSec] = useState(0), [day, setDay] = useState<number | 'all'>('all')
  const secs = secsOf(g).filter(x => x !== s.section)
  const evs = sec ? forSection(data, sec) : []
  const days = order.filter(d => d < 5 || evs.some(e => e.day === d))
  const shown = day === 'all' ? days : [day]

  return (
    <>
      <Head kicker="Any group, any section" title="Their week." />
      <div className="mb-5 grid grid-cols-2 gap-3">
        <label className="label">Group
          <select className={sel} value={g} onChange={e => { setG(+e.target.value); setSec(0) }}>{[1, 2, 3, 4, 5, 6, 7, 8].map(x => <option key={x} value={x}>Group {x}</option>)}</select>
        </label>
        <label className="label">Section
          <select className={sel} value={sec} onChange={e => setSec(+e.target.value)}>
            <option value={0} disabled>Choose</option>{secs.map(x => <option key={x} value={x}>Section {x}</option>)}
          </select>
        </label>
      </div>
      {g === s.group && <p className="label mb-4">Your own section ({s.section}) lives on the Week page.</p>}
      {!sec && <p className="label py-6">Pick a group and a section.</p>}
      {sec > 0 && !evs.length && <p className="label py-6">This schedule isn't available yet.</p>}
      {evs.length > 0 && (
        <>
          <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
            {(['all', ...days] as const).map(d => (
              <button key={d} onClick={() => setDay(d)} className={cn('label shrink-0 rounded-full border px-3 py-1.5', day === d ? 'border-ink bg-ink !text-bg' : 'border-line')}>
                {d === 'all' ? 'All' : DOW[d].slice(0, 3)}
              </button>
            ))}
          </div>
          {shown.map(d => {
            const ds = evs.filter(e => e.day === d).sort((a, b) => mins(a.start) - mins(b.start))
            if (day === 'all' && !ds.length) return null
            return (
              <section key={d} className="mb-6">
                <h2 className="mb-3 font-display text-2xl italic">{DOW[d]}</h2>
                <div className="space-y-3">{ds.length ? ds.map((e, i) => <Ticket key={e.course + e.start} e={e} i={i} />) : <p className="label">Nothing scheduled.</p>}</div>
              </section>
            )
          })}
        </>
      )}
    </>
  )
}
