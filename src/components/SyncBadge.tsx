import { syncNow, useSync } from '@/lib/sync'
import { cn } from '@/lib/utils'

/** small status line: says "Synced" only once the server has confirmed everything */
export function SyncBadge({ className }: { className?: string }) {
  const s = useSync()
  const n = s.pending + s.failed + s.conflicts
  let dot = 'bg-mute', text = 'Saved on this device', retry = false
  if (s.signedIn) {
    if (s.phase === 'offline') { dot = 'bg-gold'; text = `Offline · changes are saved on this device${n ? ` (${n} waiting)` : ''}`; retry = true }
    else if (s.phase === 'syncing') { dot = 'bg-gold animate-pulse'; text = `Syncing${n ? ` · ${n} change${n > 1 ? 's' : ''}` : '…'}` }
    else if (s.phase === 'auth') { dot = 'bg-accent'; text = `Sign in again to sync${n ? ` · ${n} waiting` : ''}` }
    else if (s.phase === 'issue') { dot = 'bg-accent'; text = `Sync issue · ${s.failed + s.conflicts} need attention`; retry = true }
    else if (n > 0) { dot = 'bg-gold'; text = `Saved on this device · ${n} waiting to upload`; retry = true }
    else { dot = 'bg-emerald-500'; text = 'Synced' }
  }
  return (
    <p role="status" className={cn('label flex items-center gap-2 !normal-case !tracking-normal', className)}>
      <i className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dot)} />
      <span>{text}</span>
      {retry && <button className="underline underline-offset-2" onClick={() => syncNow()}>Retry</button>}
    </p>
  )
}
