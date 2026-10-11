import { Moon, Sun } from 'lucide-react'
import { Head } from '@/components/Head'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { secsOf } from '@/lib/time'

const sel = 'h-11 w-full rounded-md border border-line bg-bg px-3 text-base'

export function Settings() {
  const { s, set } = useApp()
  return (
    <>
      <Head kicker="Stored only on this device" title="You." />
      <div className="space-y-4">
        <label className="label block">Name
          <input className={sel} maxLength={24} defaultValue={s.name} onBlur={e => e.target.value.trim() && set({ name: e.target.value.trim() })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="label">Group
            <select className={sel} value={s.group} onChange={e => set({ group: +e.target.value, section: secsOf(+e.target.value)[0] })}>{[1, 2, 3, 4, 5, 6, 7, 8].map(g => <option key={g} value={g}>Group {g}</option>)}</select>
          </label>
          <label className="label">Section
            <select className={sel} value={s.section} onChange={e => set({ section: +e.target.value })}>{secsOf(s.group).map(x => <option key={x} value={x}>Section {x}</option>)}</select>
          </label>
        </div>
        <Button variant="line" className="w-full" onClick={() => set({ theme: s.theme === 'dark' ? 'light' : 'dark' })}>
          {s.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {s.theme === 'dark' ? 'Switch to paper' : 'Switch to ink'}
        </Button>
        <Button variant="line" className="w-full" onClick={() => confirm('Clear your tasks and personal events on this device?') && set({ tasks: [], mine: [] })}>Reset tasks &amp; events</Button>
      </div>
      <footer className="mt-10 border-t border-line pt-5">
        <p className="label">Otomo · v1 · built by tls123</p>
        <a className="label mt-2 inline-block !text-accent" href="https://github.com/Tareq-Khalil" target="_blank" rel="noopener noreferrer">@tls123 on github ↗</a>
      </footer>
    </>
  )
}
