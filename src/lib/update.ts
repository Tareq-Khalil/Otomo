import { useSyncExternalStore } from 'react'

let waiting = false
let apply: (() => Promise<void>) | null = null
const subs = new Set<() => void>()
export const setUpdater = (f: () => Promise<void>) => { apply = f }
export const markWaiting = () => { waiting = true; subs.forEach(f => f()) }
export const useUpdateReady = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => waiting)
export const applyUpdate = () => apply?.()
