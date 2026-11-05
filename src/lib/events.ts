import { useEffect, useState } from 'react'
import { getMeta, run, setMeta } from './db'
import type { Own } from './types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventRec {
  id: string
  owner: string               // 'local' | uid
  title: string
  date: string                // YYYY-MM-DD
  startTime: string           // HH:MM
  endTime: string             // HH:MM
  createdAt: number           // ms timestamp
  updatedAt: number           // ms timestamp
  serverVersion: number | null
  deletedAt: number | null    // soft-delete
}

export interface EventOp {
  eventId: string
  owner: string
  createdAt: number
  attempts: number
  nextAt: number
  status: 'pending' | 'failed'
  error?: string
}

// ─── Internal state ───────────────────────────────────────────────────────────

let evtOwner = 'local'
let evtOwnerReady = false
const evtListeners = new Set<() => void>()

export const evtNotify = () => evtListeners.forEach(l => l())
export const setEvtOwner = (o: string) => { evtOwner = o; evtOwnerReady = true; evtNotify() }
export const getEvtOwner = () => evtOwner

// ─── Queue helpers ────────────────────────────────────────────────────────────

let evtQueue: Promise<unknown> = Promise.resolve()
export const evtSerial = <T>(f: () => Promise<T>): Promise<T> => {
  const r = evtQueue.then(f, f)
  evtQueue = r.catch(() => undefined)
  return r
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const listEvents = (o = evtOwner) =>
  run<EventRec[]>(['events'], 'readonly', t => t.objectStore('events').index('owner').getAll(o))

export const getEvent = (id: string) =>
  run<EventRec | undefined>(['events'], 'readonly', t => t.objectStore('events').get(id))

export const listEventOps = (o: string) =>
  run<EventOp[]>(['eventsOutbox'], 'readonly', t => t.objectStore('eventsOutbox').index('owner').getAll(o))

const newEventOp = (r: EventRec): EventOp => ({
  eventId: r.id, owner: r.owner,
  createdAt: Date.now(), attempts: 0, nextAt: 0, status: 'pending'
})

async function commitEvent(rec: EventRec) {
  rec.updatedAt = Date.now()
  const queue = rec.owner !== 'local'
  await run(['events', 'eventsOutbox'], 'readwrite', t => {
    const w = t.objectStore('events').put(rec)
    return queue ? t.objectStore('eventsOutbox').put(newEventOp(rec)) : w
  })
  evtNotify()
}

export type EventInput = {
  title: string
  date: string
  startTime: string
  endTime: string
}

export const createEvent = (i: EventInput): Promise<EventRec> =>
  evtSerial(async () => {
    const now = Date.now()
    const rec: EventRec = {
      id: crypto.randomUUID(), owner: evtOwner,
      title: i.title.trim().slice(0, 60),
      date: i.date, startTime: i.startTime, endTime: i.endTime,
      createdAt: now, updatedAt: now, serverVersion: null, deletedAt: null
    }
    await commitEvent(rec)
    return rec
  })

export const updateEvent = (id: string, p: Partial<Pick<EventRec, 'title' | 'date' | 'startTime' | 'endTime'>>) =>
  evtSerial(async () => {
    const rec = await getEvent(id)
    if (!rec || rec.owner !== evtOwner) return
    await commitEvent({ ...rec, ...p })
  })

export const removeEvent = (id: string) =>
  evtSerial(async () => {
    const rec = await getEvent(id)
    if (!rec || rec.owner !== evtOwner) return
    await commitEvent({ ...rec, deletedAt: Date.now() })
  })

/** Transfer all local events to a registered user (called at sign-in). */
export const claimLocalEvents = (uid: string) =>
  evtSerial(async () => {
    for (const ev of await listEvents('local')) {
      if (ev.deletedAt) continue
      await commitEvent({ ...ev, owner: uid, serverVersion: null })
    }
  })

/** Count of non-deleted local events (used to prompt transfer at sign-in). */
export const countLocalEvents = async () =>
  (await listEvents('local')).filter(e => !e.deletedAt).length

// ─── Legacy migration ─────────────────────────────────────────────────────────

/**
 * Migrates old `s.mine` personal events from localStorage into IndexedDB.
 * Runs once; subsequent calls are no-ops.
 */
export async function migrateLocalEvents(): Promise<void> {
  if (await getMeta<boolean>('eventsMigrated')) return
  let legacy: Own[] = []
  try {
    const s = JSON.parse(localStorage.getItem('uh:state') ?? 'null')
    if (Array.isArray(s?.mine)) legacy = s.mine
  } catch { /* corrupt — nothing to move */ }

  await evtSerial(async () => {
    const now = Date.now()
    for (const o of legacy) {
      if (!o.id || !o.course || !o.date) continue
      if (await getEvent(o.id)) continue  // already migrated
      await run(['events'], 'readwrite', t =>
        t.objectStore('events').put({
          id: o.id, owner: 'local',
          title: o.course.trim().slice(0, 60),
          date: o.date, startTime: o.start, endTime: o.end,
          createdAt: now, updatedAt: now, serverVersion: null, deletedAt: null
        } satisfies EventRec)
      )
    }
  })
  await setMeta('eventsMigrated', true)
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useEvents() {
  const [events, setEvents] = useState<EventRec[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let on = true
    const load = () => {
      if (!evtOwnerReady) return
      listEvents()
        .then(r => { if (on) { setEvents(r.filter(e => !e.deletedAt)); setReady(true); setError(false) } })
        .catch(() => on && setError(true))
    }
    load(); evtListeners.add(load)
    return () => { on = false; evtListeners.delete(load) }
  }, [])

  return { events, ready, error }
}

