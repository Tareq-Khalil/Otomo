import { useSyncExternalStore } from 'react'
import { delMeta, getMeta, run, setMeta } from './db'
import { fieldsOf, FIELDS, threeWay, type Fields } from './merge'
import { claimLocal, countLocal, getTask, hooks, listOps, listTasks, migrateLegacy, notify, serial, setOwner, type Op, type TaskRec } from './tasks'

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const configured = !!(URL && KEY)

class NetError extends Error {}     
class AuthError extends Error {}  

export interface SyncState {
  configured: boolean; signedIn: boolean; email: string | null
  phase: 'local' | 'offline' | 'syncing' | 'synced' | 'issue' | 'auth'
  pending: number; failed: number; conflicts: number; lastSyncAt: number | null
  issues: { taskId: string; title: string; error: string }[]
}
let st: SyncState = { configured, signedIn: false, email: null, phase: 'local', pending: 0, failed: 0, conflicts: 0, lastSyncAt: null, issues: [] }
const subs = new Set<() => void>()
const put = (p: Partial<SyncState>) => { st = { ...st, ...p }; subs.forEach(f => f()) }
export const useSync = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => st)

async function refreshCounts() {
  if (!session) return put({ pending: 0, failed: 0, conflicts: 0, issues: [] })
  const [ops, ts] = await Promise.all([listOps(session.uid), listTasks(session.uid)])
  const title = new Map(ts.map(t => [t.id, t.title]))
  put({
    pending: ops.filter(o => o.status === 'pending').length, failed: ops.filter(o => o.status === 'failed').length, conflicts: ops.filter(o => o.status === 'conflict').length,
    issues: ops.filter(o => o.status !== 'pending').map(o => ({ taskId: o.taskId, title: title.get(o.taskId) ?? 'Task', error: o.status === 'conflict' ? 'Edited on another device too: choose which version to keep.' : o.error ?? 'Rejected by the server.' }))
  })
}

interface Session { access: string; refresh: string; expiresAt: number; uid: string; email: string }
let session: Session | null = null
const toSession = (j: { access_token: string; refresh_token: string; expires_in?: number; user: { id: string; email?: string } }): Session =>
  ({ access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000, uid: j.user.id, email: j.user.email ?? '' })
const auth = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${URL}/auth/v1/${path}`, { method: 'POST', headers: { apikey: KEY!, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

async function begin(s: Session) {
  session = s
  await setMeta('session', s)
  const n = await countLocal()
  if (n > 0 && confirm(`Add the ${n} task${n > 1 ? 's' : ''} made on this device to ${s.email}? If you choose Cancel they stay on this device and reappear when you sign out.`)) await claimLocal(s.uid)
  setOwner(s.uid)
  put({ signedIn: true, email: s.email, phase: 'syncing' })
  await refreshCounts()
  kick(0)
}
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!configured) return 'Cloud sync is not set up for this build.'
  try {
    const r = await auth('token?grant_type=password', { email, password })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return j.error_description ?? j.msg ?? 'Could not sign in.'
    await begin(toSession(j)); return null
  } catch { return 'No connection. Sign-in needs the internet.' }
}
export async function signUp(email: string, password: string): Promise<string | null> {
  if (!configured) return 'Cloud sync is not set up for this build.'
  try {
    const r = await auth('signup', { email, password })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return j.msg ?? j.error_description ?? 'Could not create the account.'
    if (j.access_token) { await begin(toSession(j)); return null }
    return 'Account created. Confirm it from the email we sent, then sign in.'
  } catch { return 'No connection. Creating an account needs the internet.' }
}
export async function signOut(): Promise<boolean> {
  const n = st.pending + st.failed + st.conflicts
  if (n > 0 && !confirm(`${n} change${n > 1 ? 's' : ''} haven't reached the server yet. They stay on this device but won't upload until you sign in again to the same account. Sign out anyway?`)) return false
  try { if (session && navigator.onLine) await fetch(`${URL}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: KEY!, Authorization: `Bearer ${session.access}` } }) } catch { /* offline: local sign-out still happens */ }
  session = null
  await delMeta('session')
  setOwner('local')
  put({ signedIn: false, email: null, phase: 'local', pending: 0, failed: 0, conflicts: 0, issues: [] })
  return true
}

async function token(): Promise<string> {
  if (!session) throw new AuthError()
  if (session.expiresAt - 60_000 > Date.now()) return session.access
  let r: Response
  try { r = await auth('token?grant_type=refresh_token', { refresh_token: session.refresh }) } catch { throw new NetError() }
  if (r.status === 400 || r.status === 401 || r.status === 403) throw new AuthError()
  if (!r.ok) throw new NetError()
  const s = toSession(await r.json())
  if (s.uid !== session.uid) throw new AuthError()
  session = s; await setMeta('session', s)
  return s.access
}

interface Row { id: string; version: number; title: string; notes: string; priority: Fields['priority']; category: string | null; status: Fields['status']; completed_at: string | null; due_date: string | null; due_time: string | null; start_date: string | null; start_time: string | null; est_min: number | null; remind_min: number | null; created_at: string; updated_at: string; deleted_at: string | null }
const ms = (s: string | null) => (s ? Date.parse(s) : null)
const hm = (s: string | null) => (s ? s.slice(0, 5) : null)
const fromRow = (r: Row): Fields => ({ title: r.title, notes: r.notes ?? '', priority: r.priority, category: r.category, status: r.status, completedAt: ms(r.completed_at), dueDate: r.due_date, dueTime: hm(r.due_time), startDate: r.start_date, startTime: hm(r.start_time), estMin: r.est_min, remindMin: r.remind_min ?? null, deletedAt: ms(r.deleted_at) })
const iso = (n: number | null) => (n === null ? null : new Date(n).toISOString())
const toRow = (t: Fields) => ({ title: t.title, notes: t.notes, priority: t.priority, category: t.category, status: t.status, completed_at: iso(t.completedAt), due_date: t.dueDate, due_time: t.dueTime, start_date: t.startDate, start_time: t.startTime, est_min: t.estMin, remind_min: t.remindMin ?? null, deleted_at: iso(t.deletedAt) })

async function rest(tok: string, path: string, init: { method: string; body?: unknown; prefer?: string }) {
  let r: Response
  try {
    r = await fetch(`${URL}/rest/v1/${path}`, { method: init.method, body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { apikey: KEY!, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', ...(init.prefer ? { Prefer: init.prefer } : {}) } })
  } catch { throw new NetError() }
  if (r.status === 401) throw new AuthError()
  if (r.status === 429 || r.status >= 500) throw new NetError()
  return r
}
const fetchRow = async (tok: string, id: string): Promise<Row | null> => {
  const r = await rest(tok, `tasks?id=eq.${id}&select=*`, { method: 'GET' })
  return r.ok ? ((await r.json()) as Row[])[0] ?? null : null
}

const setOp = (op: Op, p: Partial<Op>) => run(['outbox'], 'readwrite', t => t.objectStore('outbox').put({ ...op, ...p }))
const drop = (id: string) => run(['outbox'], 'readwrite', t => t.objectStore('outbox').delete(id))

const ack = (sent: TaskRec, row: Row) => serial(async () => {
  const cur = await getTask(sent.id)
  if (!cur) return
  cur.serverVersion = row.version; cur.base = fromRow(row); cur.conflict = null
  const edited = cur.updatedAt > sent.updatedAt
  await run(['tasks', 'outbox'], 'readwrite', t => { const w = t.objectStore('tasks').put(cur); return edited ? w : t.objectStore('outbox').delete(cur.id) })
  notify()
})

const reconcile = (sent: TaskRec, row: Row, op: Op) => serial(async (): Promise<'retry' | 'done' | 'conflict'> => {
  const cur = await getTask(sent.id)
  if (!cur) return 'done'
  const server = fromRow(row)
  const { merged, conflicts } = threeWay(fieldsOf(cur), server, cur.base)
  if (conflicts.length) {
    cur.conflict = { fields: conflicts, server, version: row.version }
    await run(['tasks', 'outbox'], 'readwrite', t => { t.objectStore('outbox').put({ ...op, status: 'conflict' } satisfies Op); return t.objectStore('tasks').put(cur) })
    notify(); return 'conflict'
  }
  Object.assign(cur, merged); cur.serverVersion = row.version; cur.base = server; cur.conflict = null; cur.updatedAt = Date.now()
  const same = FIELDS.every(k => merged[k] === server[k])
  await run(['tasks', 'outbox'], 'readwrite', t => { const w = t.objectStore('tasks').put(cur); return same ? t.objectStore('outbox').delete(cur.id) : w })
  notify(); return same ? 'done' : 'retry'
})

async function pushOne(tok: string, op: Op, uid: string) {
  for (let round = 0; round < 3; round++) {
    const t = await getTask(op.taskId)
    if (!t || t.owner !== uid) { await drop(op.taskId); return }
    let res: Response
    if (t.serverVersion === null) {
      res = await rest(tok, 'tasks?on_conflict=id', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation', body: { id: t.id, owner_id: uid, created_at: iso(t.createdAt), ...toRow(t) } })
    } else {
      res = await rest(tok, `tasks?id=eq.${t.id}&version=eq.${t.serverVersion}`, { method: 'PATCH', prefer: 'return=representation', body: toRow(t) })
    }
    if (!res.ok) {
      const msg = ((await res.json().catch(() => ({}))) as { message?: string }).message ?? `Server said ${res.status}`
      await setOp(op, { status: 'failed', error: msg }); return   
    }
    const rows = (await res.json()) as Row[]
    if (rows.length) { await ack(t, rows[0]); return }
    const server = await fetchRow(tok, t.id)
    if (!server) {                                   
      await serial(async () => { const c = await getTask(t.id); if (c) await run(['tasks'], 'readwrite', x => x.objectStore('tasks').put({ ...c, serverVersion: null, base: null })) })
      continue
    }
    const out = await reconcile(t, server, op)
    if (out !== 'retry') return
  }
  throw new NetError()                                
}

async function push(tok: string, uid: string) {
  const ops = (await listOps(uid)).sort((a, b) => a.createdAt - b.createdAt)
  let waiting = false
  for (const op of ops) {
    if (op.status !== 'pending') continue
    if (op.nextAt > Date.now()) { waiting = true; continue }
    try { await pushOne(tok, op, uid) }
    catch (e) {
      if (e instanceof NetError) await setOp(op, { attempts: op.attempts + 1, nextAt: Date.now() + Math.min(2000 * 2 ** op.attempts, 300_000) * (0.75 + Math.random() / 2) })
      throw e
    }
  }
  if (waiting) throw new NetError()
}

async function pull(tok: string, uid: string) {
  const ck = `cursor:${uid}`
  let since = (await getMeta<string>(ck)) ?? '1970-01-01T00:00:00Z'
  for (let page = 0; page < 20; page++) {
    const r = await rest(tok, `tasks?select=*&owner_id=eq.${uid}&updated_at=gte.${encodeURIComponent(since)}&order=updated_at.asc,id.asc&limit=500`, { method: 'GET' })
    if (!r.ok) throw new NetError()
    const rows = (await r.json()) as Row[]
    await serial(async () => {
      const queued = new Set((await listOps(uid)).map(o => o.taskId))
      for (const row of rows) {
        const cur = await getTask(row.id)
        if (cur && cur.owner !== uid) continue
        if (cur && cur.serverVersion !== null && row.version <= cur.serverVersion) continue
        if (cur && queued.has(row.id)) continue          
        if (!cur && row.deleted_at) continue
        const f = fromRow(row)
        await run(['tasks'], 'readwrite', t => t.objectStore('tasks').put({ ...f, id: row.id, owner: uid, createdAt: Date.parse(row.created_at), updatedAt: Date.parse(row.updated_at), serverVersion: row.version, base: f, conflict: null } satisfies TaskRec))
      }
    })
    const last = rows.at(-1)?.updated_at
    if (last) { await setMeta(ck, last); if (last === since && rows.length >= 500) break; since = last }
    if (rows.length < 500) break
  }
  notify()
}

let running = false, again = false
let timer: ReturnType<typeof setTimeout> | undefined
export const kick = (delay = 800) => {
  if (!configured || !session) return
  clearTimeout(timer); timer = setTimeout(runSync, delay)
}
export const syncNow = async () => {
  if (!session) return
  for (const o of await listOps(session.uid)) if (o.status === 'failed') await setOp(o, { status: 'pending', attempts: 0, nextAt: 0, error: undefined })
  await refreshCounts(); kick(0)
}
async function runSync() {
  if (!configured || !session) return
  if (running) { again = true; return }
  if (navigator.onLine === false) { put({ phase: 'offline' }); return }
  running = true
  put({ phase: 'syncing' })
  const uid = session.uid
  try {
    const tok = await token()
    await push(tok, uid)
    await pull(tok, uid)
    await refreshCounts()
    put({ phase: st.failed || st.conflicts ? 'issue' : 'synced', lastSyncAt: Date.now() })   // 'synced' only after the server confirmed everything
  } catch (e) {
    await refreshCounts().catch(() => undefined)
    if (e instanceof AuthError) put({ phase: 'auth' })
    else { put({ phase: 'offline' }); clearTimeout(timer); timer = setTimeout(runSync, 15_000 + Math.random() * 10_000) }
  } finally {
    running = false
    if (again) { again = false; kick(300) }
  }
}

let started = false
export async function startSync() {
  if (started) return
  started = true
  try { await migrateLegacy() } catch {  }
  try { session = (await getMeta<Session>('session')) ?? null } catch { session = null }
  if (!configured) session = null
  setOwner(session?.uid ?? 'local')
  put({ signedIn: !!session, email: session?.email ?? null, phase: session ? (navigator.onLine ? 'syncing' : 'offline') : 'local' })
  hooks.write = () => { refreshCounts().catch(() => undefined); kick() }
  addEventListener('online', () => kick(0))
  addEventListener('offline', () => session && put({ phase: 'offline' }))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(0) })
  setInterval(() => kick(0), 60_000)
  await refreshCounts().catch(() => undefined)
  kick(0)
}
