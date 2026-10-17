import { useEffect, useState } from 'react'
import { getMeta, run, setMeta } from './db'
import { fieldsOf, type FieldKey, type Fields, type Priority, type Status } from './merge'

export type { Fields, Priority, Status }
export interface TaskRec extends Fields {
  id: string
  owner: string                       // 'local' until the device is signed in, then the account's user id
  createdAt: number; updatedAt: number
  serverVersion: number | null        // version of the server row this copy is based on (null = never uploaded)
  base: Fields | null                 // last server copy seen, used for three-way merges
  conflict: null | { fields: FieldKey[]; server: Fields; version: number }
}
export interface Op { opId: string; taskId: string; owner: string; type: 'upsert'; createdAt: number; attempts: number; nextAt: number; status: 'pending' | 'failed' | 'conflict'; error?: string }

// ---- plumbing -------------------------------------------------------------------------------
let q: Promise<unknown> = Promise.resolve()
/** every write to tasks/outbox is serialised so a sync step can never interleave with a user edit */
export const serial = <T>(f: () => Promise<T>): Promise<T> => { const r = q.then(f, f); q = r.catch(() => undefined); return r }
const ls = new Set<() => void>()
export const notify = () => ls.forEach(l => l())
export const hooks = { write: () => {} }
let owner = 'local'
let ownerReady = false
export const getOwner = () => owner
export const isOwnerReady = () => ownerReady
export const setOwner = (o: string) => { owner = o; ownerReady = true; notify() }

export const listTasks = (o = owner) => run<TaskRec[]>(['tasks'], 'readonly', t => t.objectStore('tasks').index('owner').getAll(o))
export const getTask = (id: string) => run<TaskRec | undefined>(['tasks'], 'readonly', t => t.objectStore('tasks').get(id))
export const listOps = (o: string) => run<Op[]>(['outbox'], 'readonly', t => t.objectStore('outbox').index('owner').getAll(o))
export const newOp = (r: TaskRec): Op => ({ opId: crypto.randomUUID(), taskId: r.id, owner: r.owner, type: 'upsert', createdAt: Date.now(), attempts: 0, nextAt: 0, status: 'pending' })

/** persist a task and (if it belongs to an account) queue its upload, atomically. Caller must hold `serial`. */
async function commit(rec: TaskRec) {
  rec.updatedAt = Date.now()
  const queue = rec.owner !== 'local'
  const old = queue ? await run<Op | undefined>(['outbox'], 'readonly', t => t.objectStore('outbox').get(rec.id)) : undefined
  await run(['tasks', 'outbox'], 'readwrite', t => {
    const w = t.objectStore('tasks').put(rec)
    return queue && old?.status !== 'conflict' ? t.objectStore('outbox').put(newOp(rec)) : w
  })
  notify(); hooks.write()
}

// ---- public API ---------------------------------------------------------------------------------
export type TaskInput = Partial<Fields> & { title: string }
export const createTask = (i: TaskInput) => serial(async () => {
  const now = Date.now(), status = i.status ?? 'todo'
  const rec: TaskRec = {
    id: crypto.randomUUID(), owner, title: i.title.trim().slice(0, 120), notes: (i.notes ?? '').slice(0, 2000), priority: i.priority ?? 'normal',
    category: i.category?.trim().slice(0, 40) || null, status, completedAt: status === 'done' ? now : null,
    dueDate: i.dueDate ?? null, dueTime: i.dueDate ? i.dueTime ?? null : null, startDate: i.startDate ?? null, startTime: i.startDate ? i.startTime ?? null : null,
    estMin: i.estMin ?? null, remindMin: i.remindMin ?? null, deletedAt: null, createdAt: now, updatedAt: now, serverVersion: null, base: null, conflict: null
  }
  await commit(rec)
  return rec
})

async function patchLocked(id: string, p: Partial<Fields>) {
  const rec = await getTask(id)
  if (!rec || rec.owner !== owner) return
  const next = { ...rec, ...p }
  if (p.status !== undefined) next.completedAt = p.status === 'done' ? (rec.status === 'done' ? rec.completedAt : Date.now()) : null
  if (next.title.trim() === '') return
  await commit(next)
}
export const updateTask = (id: string, p: Partial<Fields>) => serial(() => patchLocked(id, p))
export const toggleTask = (id: string) => serial(async () => { const r = await getTask(id); if (r) await patchLocked(id, { status: r.status === 'done' ? 'todo' : 'done' }) })
/** deleting is a soft delete so other devices learn about it; restore undoes it */
export const removeTask = (id: string) => updateTask(id, { deletedAt: Date.now() })
export const restoreTask = (id: string) => updateTask(id, { deletedAt: null })
export const removeAllTasks = () => serial(async () => { for (const t of await listTasks()) if (!t.deletedAt) await patchLocked(t.id, { deletedAt: Date.now() }) })

/** conflict choices: keep this device's version, or take the server's */
export const resolveConflict = (id: string, pick: 'mine' | 'theirs') => serial(async () => {
  const rec = await getTask(id)
  if (!rec?.conflict) return
  const { server, version } = rec.conflict
  if (pick === 'mine') {
    const next: TaskRec = { ...rec, serverVersion: version, base: server, conflict: null }
    await run(['tasks', 'outbox'], 'readwrite', t => { t.objectStore('outbox').put(newOp(next)); return t.objectStore('tasks').put({ ...next, updatedAt: Date.now() }) })
  } else {
    const next: TaskRec = { ...rec, ...server, serverVersion: version, base: server, conflict: null, updatedAt: Date.now() }
    await run(['tasks', 'outbox'], 'readwrite', t => { t.objectStore('outbox').delete(id); return t.objectStore('tasks').put(next) })
  }
  notify(); hooks.write()
})

/** tasks made while signed out can be adopted by the account that signs in */
export const countLocal = async () => (await listTasks('local')).filter(t => !t.deletedAt).length
export const claimLocal = (uid: string) => serial(async () => {
  for (const t of await listTasks('local')) {
    if (t.deletedAt) continue
    await commit({ ...t, owner: uid, serverVersion: null, base: null, conflict: null })
  }
})

/** restore from a backup file: skips ids that already exist, so repeating it never duplicates */
export const importTasks = (arr: unknown[]) => serial(async () => {
  for (const x of arr) {
    const r = x as Partial<TaskRec>
    if (!r || typeof r.id !== 'string' || typeof r.title !== 'string' || !r.title.trim() || await getTask(r.id)) continue
    const f = fieldsOf({ ...blankFields, ...r } as Fields)
    await commit({ ...f, id: r.id, owner, createdAt: r.createdAt ?? Date.now(), updatedAt: Date.now(), serverVersion: null, base: null, conflict: null })
  }
})
const blankFields: Fields = { title: '', notes: '', priority: 'normal', category: null, status: 'todo', completedAt: null, dueDate: null, dueTime: null, startDate: null, startTime: null, estMin: null, remindMin: null, deletedAt: null }

/** one-time move of the old localStorage list into IndexedDB (same ids, so repeating it cannot duplicate) */
export async function migrateLegacy() {
  if (await getMeta<boolean>('legacyMigrated')) return
  let legacy: unknown[] = []
  try { const s = JSON.parse(localStorage.getItem('uh:state') ?? 'null'); if (Array.isArray(s?.tasks)) legacy = s.tasks } catch { /* corrupt: nothing to move */ }
  await serial(async () => {
    const now = Date.now()
    for (const x of legacy) {
      const o = x as { id?: unknown; t?: unknown; c?: unknown; done?: unknown }
      const id = typeof o.id === 'string' ? o.id : '', title = typeof o.t === 'string' ? o.t.trim() : ''
      if (!id || !title || await getTask(id)) continue
      const done = o.done === true
      const cat = typeof o.c === 'string' && o.c !== 'General' ? o.c.slice(0, 40) : null
      await run(['tasks'], 'readwrite', t => t.objectStore('tasks').put({
        ...blankFields, id, owner: 'local', title: title.slice(0, 120), category: cat,
        status: done ? 'done' : 'todo', completedAt: done ? now : null, createdAt: now, updatedAt: now, serverVersion: null, base: null, conflict: null
      } satisfies TaskRec))
    }
  })
  await setMeta('legacyMigrated', true)   // the old list stays in localStorage untouched as a safety copy
}

// ---- reading helpers --------------------------------------------------------------------------
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** deadlines are local wall-clock values (no timezone): a date alone means end of that day */
export function dueAt(t: Pick<Fields, 'dueDate' | 'dueTime'>): Date | null {
  if (!t.dueDate) return null
  const [y, m, d] = t.dueDate.split('-').map(Number)
  const [hh, mm] = (t.dueTime ?? '23:59').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}
export const isOverdue = (t: Fields, now = new Date()) => t.status !== 'done' && !t.deletedAt && !!dueAt(t) && dueAt(t)! < now
export const fmtDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) }
export const PRIO_RANK: Record<Priority, number> = { low: 0, normal: 1, high: 2, urgent: 3 }
export const hint = { open: null as string | null }   // set by the dashboard to open a task when the Tasks page mounts

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRec[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    let on = true
    const load = () => {
      if (!ownerReady) return
      listTasks().then(r => { if (on) { setTasks(r.filter(x => !x.deletedAt)); setReady(true); setError(false) } }).catch(() => on && setError(true))
    }
    load(); ls.add(load)
    return () => { on = false; ls.delete(load) }
  }, [])
  return { tasks, ready, error }
}
