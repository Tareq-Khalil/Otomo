import { useState } from 'react'
import { motion } from 'motion/react'
import { Edit3, AtSign, IdCard, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { OtomoCharacter } from '@/components/OtomoCharacter'
import { useApp } from '@/lib/store'
import { FACULTIES, getFaculty, getGroups, getSections } from '@/lib/faculties'
import { useSync, saveProfile } from '@/lib/sync'

export function StudentCard() {
  const { s, set } = useApp()
  const sync = useSync()

  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(s.name)
  const [username, setUsername] = useState(s.username || sync.profile?.username || '')
  const [faculty, setFaculty] = useState(s.faculty || 'foe')
  const [level, setLevel] = useState(s.level || 1)
  const [group, setGroup] = useState(s.group || 1)
  const [section, setSection] = useState(s.section || 1)
  const [code, setCode] = useState(s.code || '')
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const selectedFac = getFaculty(faculty)
  const groups = getGroups(faculty)
  const sections = getSections(faculty, group)

  // Sync state into edit fields when opening
  const openEditor = () => {
    setName(s.name)
    setUsername(s.username || sync.profile?.username || '')
    setFaculty(s.faculty || 'foe')
    setLevel(s.level || 1)
    setGroup(s.group || 1)
    setSection(s.section || 1)
    setCode(s.code || '')
    setStatusMsg('')
    setEditOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setStatusMsg('Full Name cannot be blank.')
      return
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!cleanUsername || cleanUsername.length < 3) {
      setStatusMsg('Username must be at least 3 characters (letters, numbers, underscore).')
      return
    }

    setSaving(true)
    setStatusMsg('')

    const updated = {
      name: name.trim(),
      username: cleanUsername,
      faculty,
      level,
      group,
      section,
      code: code.trim()
    }
    set(updated)

    // If user is signed in to Supabase, update their cloud profile
    if (sync.signedIn) {
      const err = await saveProfile({
        name: name.trim(),
        username: cleanUsername,
        faculty,
        level,
        group_no: group,
        section_no: section,
        code: code.trim()
      })

      if (err) {
        setStatusMsg(`Saved locally, but cloud sync returned: ${err}`)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setEditOpen(false)
  }

  const displayHandle = s.username || sync.profile?.username || 'member'

  return (
    <div className="space-y-3">
      {/* Anime Pass Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-lg shadow-black/5"
      >
        {/* Decorative Anime Background Texture */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-accent/5 pointer-events-none blur-xl" />
        <div className="tone opacity-25" />

        <div className="relative z-10 space-y-4">
          {/* Card Top Header */}
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="seal w-7 h-7 text-xs">供</span>
              <div>
                <p className="text-[10px] font-mono tracking-wider uppercase text-mute">E-JUST · STUDENT PASS</p>
                <p className="jp text-[9px] text-mute">エジプト日本科学技術大学 · 学生証</p>
              </div>
            </div>
            {/* Japanese Official Red Stamp (Hanko) */}
            <div className="flex h-7 w-7 items-center justify-center rounded border-2 border-accent/80 text-[10px] font-display font-bold text-accent transform rotate-6 select-none shadow-sm">
              認
            </div>
          </div>

          {/* Student Identity Section */}
          <div className="flex items-center gap-4">
            <div className="shrink-0 p-1.5 rounded-2xl bg-surface border border-line shadow-inner">
              <OtomoCharacter mood="happy" size="sm" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {/* Username prominently as primary identity */}
              <div>
                <div className="flex items-center gap-1 font-mono text-sm text-accent font-semibold tracking-wide">
                  <AtSign size={13} className="shrink-0" />
                  <span>{displayHandle}</span>
                </div>
                <h3 className="font-display text-xl font-medium tracking-tight text-ink truncate leading-tight mt-0.5">
                  {s.name || 'Student'}
                </h3>
              </div>

              <p className="font-mono text-xs text-mute flex items-center gap-1.5 pt-0.5">
                <IdCard size={13} className="text-accent" />
                ID: <span className="text-ink font-semibold">{s.code || 'Not set'}</span>
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="label rounded-md border border-line bg-bg px-2 py-0.5 text-[10px] text-ink">
                  {selectedFac?.shortName || 'FoE'} · Level {s.level || 1}
                </span>
                <span className="label rounded-md border border-line bg-bg px-2 py-0.5 text-[10px] text-ink">
                  Group {s.group || 1}
                </span>
                <span className="label rounded-md border border-line bg-bg px-2 py-0.5 text-[10px] text-ink">
                  Section {s.section || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Barcode & Edit Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-line/60">
            {/* Anime-style Barcode decoration */}
            <div className="flex items-center gap-0.5 opacity-60">
              <span className="h-5 w-0.5 bg-ink" />
              <span className="h-5 w-1 bg-ink" />
              <span className="h-5 w-0.5 bg-ink" />
              <span className="h-5 w-1.5 bg-ink" />
              <span className="h-5 w-0.5 bg-ink" />
              <span className="h-5 w-1 bg-ink" />
              <span className="h-5 w-2 bg-ink" />
              <span className="h-5 w-0.5 bg-ink" />
              <span className="h-5 w-1 bg-ink" />
              <span className="ml-1 font-mono text-[9px] text-mute">{s.code ? `*${s.code}*` : '*OTOMO-PASS*'}</span>
            </div>

            {/* Dedicated Change Data Button */}
            <Button
              size="sm"
              variant="accent"
              onClick={openEditor}
              className="text-xs h-8 px-3.5 shadow-sm"
            >
              <Edit3 size={13} className="mr-1.5" /> Change My Data
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Edit Data Modal Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen} title="Change Profile & Academic Data">
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <p className="text-xs text-mute leading-relaxed">
            You can customize both your <b>Full Name</b> (display name) and unique <b>Username</b> (@handle).
            Changes are saved locally and synced to your cloud account when signed in.
          </p>

          {/* 1. Full Name (Display Name) */}
          <div>
            <label className="label block mb-1">
              Full Name (Display Name)
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="text"
                required
                maxLength={30}
                placeholder="e.g. Tareq Khalil"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-bg pl-10 pr-3.5 text-base text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-mute mt-1">
              Your real name shown on greetings, tickets, and focus reports.
            </p>
          </div>

          {/* 2. Username (Handle) */}
          <div>
            <label className="label block mb-1">
              Username (@handle)
            </label>
            <div className="relative">
              <AtSign size={15} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                placeholder="e.g. tareq_k"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="h-11 w-full rounded-xl border border-line bg-bg pl-10 pr-3.5 text-sm font-mono text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-mute mt-1">
              Unique handle for cloud sync and leaderboard (lowercase letters, numbers, _).
            </p>
          </div>

          {/* 3. Student Code */}
          <div>
            <label className="label block mb-1">
              Student Code (Academic ID)
            </label>
            <div className="relative">
              <IdCard size={15} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="text"
                placeholder="e.g. 120260123"
                maxLength={15}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\s+/g, ''))}
                className="h-11 w-full rounded-xl border border-line bg-bg pl-10 pr-3.5 text-base font-mono text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-mute mt-1">
              Used to match your midterm examination hall in Building 18.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label block mb-1">Faculty</label>
              <select
                value={faculty}
                onChange={e => {
                  const newFac = e.target.value
                  setFaculty(newFac)
                  const newSecs = getSections(newFac, 1)
                  if (newSecs.length) setSection(newSecs[0])
                }}
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {FACULTIES.map(f => (
                  <option key={f.id} value={f.id}>{f.shortName} ({f.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label block mb-1">Academic Level</label>
              <select
                value={level}
                onChange={e => setLevel(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {selectedFac?.levels.map(l => (
                  <option key={l.level} value={l.level} disabled={!l.supported}>
                    {l.label} {!l.supported ? '(Coming soon)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label block mb-1">Group</label>
              <select
                value={group}
                onChange={e => {
                  const g = Number(e.target.value)
                  setGroup(g)
                  const secs = getSections(faculty, g)
                  if (secs.length) setSection(secs[0])
                }}
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {groups.map(g => (
                  <option key={g} value={g}>Group {g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label block mb-1">Section</label>
              <select
                value={section}
                onChange={e => setSection(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {sections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
          </div>

          {statusMsg && (
            <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-xl p-3">
              {statusMsg}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="line"
              className="flex-1"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="flex-1"
              disabled={saving || !name.trim() || !username.trim()}
            >
              <Save size={14} className="mr-1.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
