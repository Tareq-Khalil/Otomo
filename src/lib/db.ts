const NAME = 'otomo'
const VERSION = 2   // bumped from 1: added 'events' store
let opened: Promise<IDBDatabase> | null = null

export const db = (): Promise<IDBDatabase> =>
  (opened ??= new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('IndexedDB unavailable'))
    const r = indexedDB.open(NAME, VERSION)
    r.onupgradeneeded = (e) => {
      const d = r.result
      const oldVersion = e.oldVersion

      // v1 stores (create if upgrading from 0, skip if already exist)
      if (oldVersion < 1) {
        if (!d.objectStoreNames.contains('tasks'))
          d.createObjectStore('tasks', { keyPath: 'id' }).createIndex('owner', 'owner')
        if (!d.objectStoreNames.contains('outbox'))
          d.createObjectStore('outbox', { keyPath: 'taskId' }).createIndex('owner', 'owner')
        if (!d.objectStoreNames.contains('meta'))
          d.createObjectStore('meta')
      }

      // v2 stores — safe to run on existing v1 DBs
      if (oldVersion < 2) {
        if (!d.objectStoreNames.contains('events'))
          d.createObjectStore('events', { keyPath: 'id' }).createIndex('owner', 'owner')
        if (!d.objectStoreNames.contains('eventsOutbox'))
          d.createObjectStore('eventsOutbox', { keyPath: 'eventId' }).createIndex('owner', 'owner')
      }
    }
    r.onsuccess = () => {
      r.result.onversionchange = () => { r.result.close(); opened = null }
      res(r.result)
    }
    r.onerror = () => { opened = null; rej(r.error) }
  }))

export async function run<T = unknown>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest | void): Promise<T> {
  const d = await db()
  return new Promise<T>((res, rej) => {
    const t = d.transaction(stores, mode)
    const r = fn(t)
    t.oncomplete = () => res((r ? r.result : undefined) as T)
    t.onerror = t.onabort = () => rej(t.error ?? new Error('transaction failed'))
  })
}
export const getMeta = <T>(k: string) => run<T | undefined>(['meta'], 'readonly', t => t.objectStore('meta').get(k))
export const setMeta = (k: string, v: unknown) => run(['meta'], 'readwrite', t => t.objectStore('meta').put(v, k))
export const delMeta = (k: string) => run(['meta'], 'readwrite', t => t.objectStore('meta').delete(k))
