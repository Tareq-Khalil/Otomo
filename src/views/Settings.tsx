import { useEffect, useState } from 'react'
import { Download, Moon, Sun, Upload, MessageSquarePlus, Brain, ShieldAlert, Sparkles } from 'lucide-react'
import { Head } from '@/components/Head'
import { Button } from '@/components/ui/button'
import { Account } from '@/components/Account'
import { StudentCard } from '@/components/StudentCard'
import { ProfileCompletion } from '@/components/ProfileCompletion'
import { OtomoCharacter } from '@/components/OtomoCharacter'
import { FeedbackModal } from '@/components/FeedbackModal'
import { MemoryManagerModal } from '@/components/MemoryManagerModal'
import { importTasks, listTasks, removeAllTasks } from '@/lib/tasks'
import { listEvents } from '@/lib/events'
import { run } from '@/lib/db'
import { useApp } from '@/lib/store'
import { useSync } from '@/lib/sync'
import { checkAdminRole } from '@/lib/feedback'

const KEYS = ['uh:state', 'uh:study']

interface SettingsProps {
  onOpenStudio?: () => void
}

export function Settings({ onOpenStudio }: SettingsProps) {
  const { s, set } = useApp()
  const sync = useSync()
  const owner = sync.signedIn && sync.email ? sync.email : 'local_student'

  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(false)
    if (!sync.signedIn) return
    const raw = localStorage.getItem('otomo_session') || localStorage.getItem('uh:meta:session')
    if (!raw) return
    try {
      const token = JSON.parse(raw).access
      void checkAdminRole(token).then(setIsAdmin)
    } catch { }
  }, [sync.signedIn])

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

        {/* ─── Integrated Otomo-chan Companion Passport ───────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <OtomoCharacter
                mood="welcome"
                size="sm"
                showBadge={false}
                subtleAnimation={true}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="label !text-accent font-semibold flex items-center gap-1">
                  <Sparkles size={11} /> Otomo-chan Companion
                </span>
                <span className="jp text-[10px] text-mute">お供ちゃん</span>
              </div>
              <p className="mt-1 text-xs text-ink/80 leading-relaxed font-medium">
                Personalized study companion ready to assist with timetable, tasks, and revision.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMemoryOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink hover:border-accent hover:text-accent transition-colors"
                >
                  <Brain size={12} />
                  <span>Manage Memories</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink hover:border-accent hover:text-accent transition-colors"
                >
                  <MessageSquarePlus size={12} />
                  <span>Send Feedback</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account and Cloud Sync card */}
        <Account />

        {/* Feedback & Complaints Prominent Trigger */}
        <Button
          variant="line"
          className="w-full flex items-center justify-center gap-2 hover:border-accent hover:text-accent"
          onClick={() => setFeedbackOpen(true)}
        >
          <MessageSquarePlus size={15} />
          Suggestions &amp; Complaints
        </Button>

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

        {/* Developer Studio Button */}
        {onOpenStudio && isAdmin && (
          <Button
            variant="line"
            className="w-full font-mono text-xs text-mute hover:border-gold hover:text-gold"
            onClick={onOpenStudio}
          >
            <ShieldAlert size={14} /> Otomo-chan Developer Studio
          </Button>
        )}

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
        <p className="label">Otomo · v4.0.0 · built for E-JUST students</p>
        <a className="label mt-2 inline-block !text-accent" href="https://github.com/Tareq-Khalil" target="_blank" rel="noopener noreferrer">
          @tls123 on github ↗
        </a>
      </footer>

      {/* Modals */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <MemoryManagerModal open={memoryOpen} owner={owner} onClose={() => setMemoryOpen(false)} />
    </>
  )
}
