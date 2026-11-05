import { Download, Moon, Sun, Upload } from 'lucide-react'
import { Head } from '@/components/Head'
import { Button } from '@/components/ui/button'
import { Account } from '@/components/Account'
import { StudentCard } from '@/components/StudentCard'
import { ProfileCompletion } from '@/components/ProfileCompletion'
import { importTasks, listTasks, removeAllTasks } from '@/lib/tasks'
import { listEvents } from '@/lib/events'
import { run } from '@/lib/db'
import { useApp } from '@/lib/store'

const KEYS = ['uh:state', 'uh:study']

export function Settings() {
  const { s, set } = useApp()

  const backup = async () => {
    const o: Record<string, unknown> = {}
    try { o.tasks = (await listTasks()).filter(t => !t.deletedAt) } catch { /* storage unavailable */ }
    try { o.events = (await listEvents()).filter(e => !e.deletedAt) } catch { /* storage unavailable */ }
    for (const k of KEYS) { try { o[k] = JSON.parse(localStorage.getItem(k) ?? 'null') } catch { /* skip */ } }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ otomo: 2, ...o })], { type: 'application/json' }))
    a.download = `otomo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const restore = async (f?: File) => {
    if (!f) return
    try {
      const j = JSON.parse(await f.text())
      if (!j || (j.otomo !== 1 && j.otomo !== 2) || typeof j['uh:state'] !== 'object') throw new Error()
      for (const k of KEYS) if (j[k]) localStorage.setItem(k, JSON.stringify(j[k]))
      if (Array.isArray(j.tasks)) await importTasks(j.tasks)
      if (Array.isArray(j.events)) {
        await run(['events'], 'readwrite', (t: IDBTransaction) => {
          for (const ev of j.events) t.objectStore('events').put(ev)
        })
      }
      location.reload()
    } catch {
      alert('That file is not a valid Otomo backup.')
    }
  }

  return (
    <>
      <Head kicker="Personalized &amp; Stored Locally" title="You." jp="あなた" />
      <div className="max-w-xl space-y-4">
        {/* Banner prompting existing users to complete academic fields if missing */}
        <ProfileCompletion />

        {/* Anime Student Pass Card with "Change My Data" button */}
        <StudentCard />

        {/* Account and Cloud Sync card */}
        <Account />

        {/* Theme switcher */}
        <Button
          variant="line"
          className="w-full"
          onClick={() => set({ theme: s.theme === 'dark' ? 'light' : 'dark' })}
        >
          {s.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}{' '}
          {s.theme === 'dark' ? 'Switch to paper (Light mode)' : 'Switch to ink (Dark mode)'}
        </Button>

        {/* Backup and Restore */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="line" onClick={backup}>
            <Download size={15} /> Back up data
          </Button>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line font-mono text-xs uppercase tracking-widest hover:border-accent transition-colors focus-within:outline-2">
            <Upload size={15} /> Restore data
            <input type="file" accept="application/json" className="sr-only" onChange={e => restore(e.target.files?.[0])} />
          </label>
        </div>

        {/* Reset */}
        <Button
          variant="line"
          className="w-full text-accent hover:bg-accent/10"
          onClick={() =>
            confirm('Delete all your tasks and personal events? Synced items will also be removed from your cloud account.') &&
            (removeAllTasks(), set({ tasks: [], mine: [] }))
          }
        >
          Reset tasks &amp; events
        </Button>
      </div>

      <footer className="mt-10 border-t border-line pt-5">
        <p className="label">Otomo · v3.0 · built for E-JUST students</p>
        <a className="label mt-2 inline-block !text-accent" href="https://github.com/Tareq-Khalil" target="_blank" rel="noopener noreferrer">
          @tls123 on github ↗
        </a>
      </footer>
    </>
  )
}
