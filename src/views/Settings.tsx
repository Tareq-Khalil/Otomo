import { Download, Moon, Sun, Upload } from 'lucide-react'
import { Head } from '@/components/Head'
import { Button } from '@/components/ui/button'
import { Account } from '@/components/Account'
import { importTasks, listTasks, removeAllTasks } from '@/lib/tasks'
import { useApp } from '@/lib/store'
import { secsOf } from '@/lib/time'

const sel = 'h-11 w-full rounded-xl border border-line bg-bg px-3 text-base'
const KEYS = ['uh:state', 'uh:study']

export function Settings() {
  const { s, set } = useApp()
  const backup = async () => {
    const o: Record<string, unknown> = {}
    try { o.tasks = (await listTasks()).filter(t => !t.deletedAt) } catch { /* storage unavailable */ }
    for (const k of KEYS) { try { o[k] = JSON.parse(localStorage.getItem(k) ?? 'null') } catch { /* skip */ } }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ otomo: 1, ...o })], { type: 'application/json' }))
    a.download = 'otomo-backup.json'; a.click(); URL.revokeObjectURL(a.href)
  }
  const restore = async (f?: File) => {
    if (!f) return
    try {
      const j = JSON.parse(await f.text())
      if (!j || j.otomo !== 1 || typeof j['uh:state'] !== 'object') throw new Error()
      for (const k of KEYS) if (j[k]) localStorage.setItem(k, JSON.stringify(j[k]))
      if (Array.isArray(j.tasks)) await importTasks(j.tasks)
      location.reload()
    } catch { alert('That file is not an Otomo backup.') }
  }
  return (
    <>
      <Head kicker="Stored only on this device" title="You." jp="あなた" />
      <div className="max-w-xl space-y-4">
        <Account />
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
        <div className="grid grid-cols-2 gap-3">
          <Button variant="line" onClick={backup}><Download size={15} /> Back up</Button>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line font-mono text-xs uppercase tracking-widest focus-within:outline-2">
            <Upload size={15} /> Restore
            <input type="file" accept="application/json" className="sr-only" onChange={e => restore(e.target.files?.[0])} />
          </label>
        </div>
        <Button variant="line" className="w-full" onClick={() => confirm('Delete all your tasks and personal events? Synced tasks are removed from your account too.') && (removeAllTasks(), set({ tasks: [], mine: [] }))}>Reset tasks &amp; events</Button>
      </div>
      <footer className="mt-10 border-t border-line pt-5">
        <p className="label">Otomo · v2 · built by tls123</p>
        <a className="label mt-2 inline-block !text-accent" href="https://github.com/Tareq-Khalil" target="_blank" rel="noopener noreferrer">@tls123 on github ↗</a>
      </footer>
    </>
  )
}
