import { useState } from 'react'
import { Info } from 'lucide-react'
import { Head } from '@/components/Head'
import { Ticket } from '@/components/Ticket'
import { forSection } from '@/lib/schedule'
import { useApp } from '@/lib/store'
import { DOW, mins } from '@/lib/time'
import { getGroups, getSections } from '@/lib/faculties'
import { cn } from '@/lib/utils'

const order = [6, 0, 1, 2, 3, 4, 5]
const sel = 'h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink focus:border-accent focus:outline-none'

export function Others() {
  const { s, data } = useApp()
  const faculty = s.faculty || 'foe'
  const groups = getGroups(faculty)

  const [g, setG] = useState(s.group || 1)
  const [sec, setSec] = useState(0)
  const [day, setDay] = useState<number | 'all'>('all')

  const availableSections = getSections(faculty, g).filter(x => x !== s.section)
  const evs = sec ? forSection(data, sec) : []
  const days = order.filter(d => d < 5 || evs.some(e => e.day === d))
  const shown = day === 'all' ? days : [day]

  return (
    <>
      <Head kicker="FoE Level 1 Directory" title="Their week." jp="みんなの週" />

      {/* Standard Schedule Notice */}
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface/70 p-3 text-xs text-mute leading-relaxed">
        <Info size={16} className="shrink-0 text-accent mt-0.5" />
        <p>
          This displays the <b>standard lecture &amp; lab timetable</b> for Faculty of Engineering Level 1.
          Schedules can change depending on the academic calendar, such as during midterm or final examination weeks.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <label className="label">
          Group
          <select
            className={sel}
            value={g}
            onChange={e => {
              setG(+e.target.value)
              setSec(0)
            }}
          >
            {groups.map(x => (
              <option key={x} value={x}>Group {x}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Section
          <select
            className={sel}
            value={sec}
            onChange={e => setSec(+e.target.value)}
          >
            <option value={0} disabled>Choose section</option>
            {availableSections.map(x => (
              <option key={x} value={x}>Section {x}</option>
            ))}
          </select>
        </label>
      </div>

      {g === s.group && (
        <p className="label mb-4 text-mute">
          Your own section ({s.section}) is shown directly on the <b>Week</b> tab.
        </p>
      )}

      {!sec && <p className="label py-6 text-center">Pick a group and a section above to view their timetable.</p>}
      {sec > 0 && !evs.length && <p className="label py-6 text-center">This schedule isn't available yet.</p>}

      {evs.length > 0 && (
        <>
          <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
            {(['all', ...days] as const).map(d => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={cn(
                  'label shrink-0 rounded-full border px-3 py-1.5 transition-colors',
                  day === d ? 'border-ink bg-ink !text-bg' : 'border-line text-mute hover:text-ink'
                )}
              >
                {d === 'all' ? 'All Days' : DOW[d].slice(0, 3)}
              </button>
            ))}
          </div>

          {shown.map(d => {
            const ds = evs.filter(e => e.day === d).sort((a, b) => mins(a.start) - mins(b.start))
            if (day === 'all' && !ds.length) return null
            return (
              <section key={d} className="mb-6">
                <h2 className="mb-3 font-display text-2xl italic">{DOW[d]}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {ds.length ? (
                    ds.map((e, i) => <Ticket key={e.course + e.start} e={e} i={i} />)
                  ) : (
                    <p className="label">Nothing scheduled.</p>
                  )}
                </div>
              </section>
            )
          })}
        </>
      )}
    </>
  )
}
