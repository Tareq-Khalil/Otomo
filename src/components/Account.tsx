import { useState, type FormEvent } from 'react'
import { AtSign, Lock, Mail, User, ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SyncBadge } from '@/components/SyncBadge'
import { configured, signIn, signOut, signUp, useSync } from '@/lib/sync'
import { useApp } from '@/lib/store'
import { FACULTIES, getFaculty, getGroups, getSections } from '@/lib/faculties'

const field = 'mt-1 h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm normal-case tracking-normal text-ink focus:border-accent focus:outline-none'

export function Account() {
  const { s, set } = useApp()
  const sync = useSync()

  // Mode: 'signin' | 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  // Auth fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState(s.username || '')

  // Academic fields for registration (prefilled from current guest state)
  const [name, setName] = useState(s.name)
  const [faculty, setFaculty] = useState(s.faculty || 'foe')
  const [level, setLevel] = useState(s.level || 1)
  const [code, setCode] = useState(s.code || '')
  const [group, setGroup] = useState(s.group || 1)
  const [section, setSection] = useState(s.section || 1)

  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedFac = getFaculty(faculty)
  const groups = getGroups(faculty)
  const sections = getSections(faculty, group)

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const err = await signIn(email.trim(), password)
    setBusy(false)
    if (err) setMsg(err)
    else setPassword('')
  }

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')

    // Validate
    if (!username.trim() || username.length < 3) {
      setBusy(false)
      setMsg('Username must be at least 3 characters.')
      return
    }
    if (!name.trim()) {
      setBusy(false)
      setMsg('Please enter your name.')
      return
    }
    if (code.trim().length < 6) {
      setBusy(false)
      setMsg('Please enter a valid student code (at least 6 digits).')
      return
    }

    const err = await signUp(email.trim(), password, {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      faculty,
      level,
      group_no: group,
      section_no: section,
      code: code.trim()
    })

    setBusy(false)
    if (err) {
      setMsg(err)
    } else {
      // Sync local state to match newly registered profile
      set({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        faculty,
        level,
        group,
        section,
        code: code.trim()
      })
      setPassword('')
    }
  }

  if (!configured) {
    return (
      <p className="label !normal-case !tracking-normal rounded-xl border border-line p-4">
        Your tasks &amp; events are saved locally on this device. Cloud sync turns on when built with Supabase environment variables.
      </p>
    )
  }

  return (
    <section className="rounded-2xl border border-line p-5 bg-surface/50" aria-label="Account">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="label !text-accent">Account · アカウント</p>
          <h3 className="font-display text-xl font-light italic">
            {sync.signedIn ? 'Cloud Profile' : 'Access & Cloud Sync'}
          </h3>
        </div>
        <SyncBadge />
      </div>

      {sync.signedIn ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-bg p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-accent flex items-center gap-0.5">
                <AtSign size={13} />
                {sync.profile?.username || s.username || 'member'}
              </span>
              <span className="text-xs text-mute truncate">{sync.profile?.name || s.name}</span>
            </div>
            <p className="text-xs text-mute font-mono">{sync.email}</p>
            <div className="pt-2 border-t border-line grid grid-cols-2 gap-2 text-xs text-mute">
              <div>Faculty: <span className="text-ink uppercase font-medium">{sync.profile?.faculty || s.faculty || 'FoE'}</span></div>
              <div>Level: <span className="text-ink font-medium">{sync.profile?.level || s.level || 1}</span></div>
              <div>Group {sync.profile?.group_no || s.group} · Section {sync.profile?.section_no || s.section}</div>
              <div>ID: <span className="text-ink font-mono">{sync.profile?.code || s.code || '—'}</span></div>
            </div>
          </div>

          {sync.issues.length > 0 && (
            <ul className="space-y-1">
              {sync.issues.map(i => (
                <li key={i.taskId} className="label !normal-case !tracking-normal !text-accent">
                  {i.title}: {i.error}
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="line"
            size="sm"
            className="w-full text-xs text-mute hover:text-accent"
            onClick={() => signOut()}
          >
            <LogOut size={14} className="mr-1.5" /> Sign out of this device
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex rounded-xl border border-line p-1 bg-bg">
            <button
              type="button"
              onClick={() => { setMode('signin'); setMsg('') }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                mode === 'signin' ? 'bg-surface text-ink shadow-sm' : 'text-mute hover:text-ink'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setMsg('') }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                mode === 'signup' ? 'bg-surface text-ink shadow-sm' : 'text-mute hover:text-ink'
              }`}
            >
              Create Account
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="label block">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@ejust.edu.eg"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label className="label block">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={field}
                />
              </div>

              <Button variant="accent" type="submit" className="w-full" disabled={busy || !email || !password}>
                {busy ? 'Signing in...' : 'Sign in to Account'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <p className="text-xs text-mute">
                Registering saves your local tasks, personal events, and settings directly to the cloud.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label block">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className="label block">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={field}
                  />
                </div>
              </div>

              <div>
                <label className="label block">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@ejust.edu.eg"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={field}
                />
              </div>

              <div>
                <label className="label block">Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={field}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label block">Faculty</label>
                  <select
                    value={faculty}
                    onChange={e => setFaculty(e.target.value)}
                    className={field}
                  >
                    {FACULTIES.map(f => (
                      <option key={f.id} value={f.id}>{f.shortName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label block">Level</label>
                  <select
                    value={level}
                    onChange={e => setLevel(Number(e.target.value))}
                    className={field}
                  >
                    {selectedFac?.levels.map(l => (
                      <option key={l.level} value={l.level} disabled={!l.supported}>
                        {l.label} {!l.supported ? '(Coming soon)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label block">Group</label>
                  <select
                    value={group}
                    onChange={e => {
                      const g = Number(e.target.value)
                      setGroup(g)
                      const secs = getSections(faculty, g)
                      if (secs.length) setSection(secs[0])
                    }}
                    className={field}
                  >
                    {groups.map(g => (
                      <option key={g} value={g}>Group {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label block">Section</label>
                  <select
                    value={section}
                    onChange={e => setSection(Number(e.target.value))}
                    className={field}
                  >
                    {sections.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label block">Student Code (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 120260123"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\s+/g, ''))}
                  className={field}
                />
              </div>

              <Button
                variant="accent"
                type="submit"
                className="w-full"
                disabled={busy || !username || !email || password.length < 8 || !name || code.length < 6}
              >
                {busy ? 'Creating Cloud Account...' : 'Register & Sync Data'}
              </Button>
            </form>
          )}

          {msg && (
            <p role="alert" className="label mt-3 !normal-case !tracking-normal !text-accent bg-accent/10 border border-accent/20 rounded-xl p-3">
              {msg}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
