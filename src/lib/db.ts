const NAME = 'otomo'
const VERSION = 1
let opened: Promise<IDBDatabase> | null = null

export const db = (): Promise<IDBDatabase> =>
  (opened ??= new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('IndexedDB unavailable'))
    const r = indexedDB.open(NAME, VERSION)
    r.onupgradeneeded = () => {
      const d = r.result
      if (!d.objectStoreNames.contains('tasks')) d.createObjectStore('tasks', { keyPath: 'id' }).createIndex('owner', 'owner')
      if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'taskId' }).createIndex('owner', 'owner')
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta')
    }
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); opened = null }; res(r.result) }
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
