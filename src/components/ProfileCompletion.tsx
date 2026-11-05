import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertCircle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { useApp } from '@/lib/store'
import { FACULTIES, getFaculty, isSupported } from '@/lib/faculties'
import { useSync, saveProfile } from '@/lib/sync'

export function ProfileCompletion() {
  const { s, set } = useApp()
  const sync = useSync()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(s.name || '')
  const [username, setUsername] = useState(s.username || sync.profile?.username || '')
  const [faculty, setFaculty] = useState(s.faculty || 'foe')
  const [level, setLevel] = useState(s.level || 1)
  const [code, setCode] = useState(s.code || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const isComplete = Boolean(s.faculty && s.level && s.code && s.username)
  if (isComplete) return null

  const selectedFac = getFaculty(faculty)
  const canSubmit = isSupported(faculty, level) && code.trim().length >= 6

  const handleSave = async () => {
    if (!canSubmit) return
    setSaving(true)
    setMsg('')

    const cleanUsername = (username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || s.username || `user_${code.slice(-4)}`).slice(0, 30)

    const updated = {
      name: name.trim() || s.name || 'Student',
      username: cleanUsername,
      faculty,
      level,
      code: code.trim()
    }
    set(updated)

    // If user is registered and signed in, sync to Supabase profile
    if (sync.signedIn) {
      const err = await saveProfile({
        name: updated.name,
        username: cleanUsername,
        faculty,
        level,
        group_no: s.group || 1,
        section_no: s.section || 1,
        code: code.trim()
      })
      if (err) {
        setMsg(`Saved locally, but cloud profile sync failed: ${err}`)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setOpen(false)
  }

  return (
    <>
      {/* Subtle notification banner */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-3.5 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles size={18} className="shrink-0 text-accent animate-pulse" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink truncate">
              Complete your academic profile
            </p>
            <p className="text-[11px] text-mute">
              Add your student code &amp; level to view exam rooms &amp; schedules.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="accent"
          onClick={() => setOpen(true)}
          className="shrink-0 text-xs h-8 px-3"
        >
          Complete <ChevronRight size={14} className="ml-0.5" />
        </Button>
      </motion.div>

      {/* Completion Modal Sheet */}
      <Sheet open={open} onOpenChange={setOpen} title="Complete Academic Profile">
        <div className="space-y-4 pt-1">
          <p className="text-xs text-mute leading-relaxed">
            Otomo now personalizes your exam room, schedule, and academic updates using your faculty, level, and student code.
          </p>

          <div>
            <label className="label block mb-1.5">Faculty</label>
            <div className="grid grid-cols-1 gap-2">
              {FACULTIES.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFaculty(f.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    faculty === f.id
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-line bg-surface hover:border-line/80'
                  }`}
                >
                  <div>
                    <span className="block font-medium text-sm text-ink">{f.name}</span>
                    <span className="label text-[10px]">{f.shortName}</span>
                  </div>
                  {faculty === f.id && <CheckCircle2 size={16} className="text-accent" />}
                </button>
              ))}
            </div>
          </div>

          {selectedFac && (
            <div>
              <label className="label block mb-1.5">Academic Level</label>
              <div className="grid grid-cols-4 gap-2">
                {selectedFac.levels.map(l => (
                  <button
                    key={l.level}
                    type="button"
                    onClick={() => setLevel(l.level)}
                    className={`rounded-xl border py-2 text-center text-sm font-medium transition-all ${
                      level === l.level
                        ? 'border-accent bg-accent text-white shadow-sm'
                        : 'border-line bg-surface text-ink hover:border-line/80'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              {!isSupported(faculty, level) && (
                <p className="mt-2 text-xs text-gold flex items-center gap-1.5">
                  <AlertCircle size={14} /> Level {level} timetable &amp; exams will arrive in an upcoming release!
                </p>
              )}
            </div>
          )}

          <div>
            <label className="label block mb-1.5">
              Student Code (Academic ID)
            </label>
            <input
              type="text"
              placeholder="e.g. 120260123"
              maxLength={15}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\s+/g, ''))}
              className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-base font-mono text-ink placeholder:text-mute/50 focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-mute">
              Used strictly to calculate your specific exam hall in Building 18.
            </p>
          </div>

          {msg && (
            <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg p-2.5">
              {msg}
            </p>
          )}

          <Button
            variant="accent"
            className="w-full mt-4"
            disabled={!canSubmit || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </Sheet>
    </>
  )
}

