import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { SyncBadge } from '@/components/SyncBadge'
import { configured, signIn, signOut, signUp, useSync } from '@/lib/sync'

const field = 'mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-base normal-case tracking-normal'

export function Account() {
  const s = useSync()
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const go = (up: boolean) => async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const err = await (up ? signUp : signIn)(email.trim(), pw)
    setBusy(false); setMsg(err ?? ''); if (!err) setPw('')
  }
  if (!configured) return <p className="label !normal-case !tracking-normal rounded-xl border border-line p-4">Your tasks are saved on this device. Cloud sync turns on when the site is built with Supabase settings.</p>
  return (
    <section className="rounded-xl border border-line p-4" aria-label="Account">
      <p className="label mb-2">Account <span className="jp">アカウント</span></p>
      {s.signedIn ? (
        <>
          <p className="mb-1 break-all">{s.email}</p>
          <SyncBadge />
          {s.issues.length > 0 && (
            <ul className="mt-3 space-y-1">{s.issues.map(i => <li key={i.taskId} className="label !normal-case !tracking-normal !text-accent">{i.title}: {i.error}</li>)}</ul>
          )}
          <Button variant="line" size="sm" className="mt-3" onClick={() => signOut()}>Sign out</Button>
        </>
      ) : (
        <form onSubmit={go(false)} className="space-y-3">
          <SyncBadge />
          <label className="label block">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className={field} /></label>
          <label className="label block">Password<input type="password" autoComplete="current-password" required minLength={8} value={pw} onChange={e => setPw(e.target.value)} className={field} /></label>
          <div className="flex gap-2">
            <Button variant="accent" type="submit" disabled={busy}>Sign in</Button>
            <Button variant="line" type="button" disabled={busy || !email || pw.length < 8} onClick={go(true) as unknown as () => void}>Create account</Button>
          </div>
        </form>
      )}
      {msg && <p role="alert" className="label mt-3 !normal-case !tracking-normal !text-accent">{msg}</p>}
    </section>
  )
}
