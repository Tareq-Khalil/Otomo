import { useSyncExternalStore } from 'react'

let waiting = false
let apply: (() => Promise<void>) | null = null
const subs = new Set<() => void>()
export const setUpdater = (f: () => Promise<void>) => { apply = f }
export const markWaiting = () => { waiting = true; subs.forEach(f => f()) }
export const useUpdateReady = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => waiting)
/** swaps to the new version and reloads. Tasks and the upload queue live in IndexedDB, so nothing is lost. */
export const applyUpdate = () => apply?.()
