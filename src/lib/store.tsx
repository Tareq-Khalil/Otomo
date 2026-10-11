import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { Data, State } from './types'

/** localStorage-backed state; a corrupt or blocked store never crashes the app */
export function usePersisted<T>(key: string, init: T): [T, Dispatch<SetStateAction<T>>] {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? { ...init, ...JSON.parse(raw) } : init } catch { return init }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private mode */ } }, [key, v])
  return [v, setV]
}

export const blank: State = { name: '', group: 0, section: 0, theme: 'dark', tasks: [], mine: [] }

interface Ctx { s: State; set: (p: Partial<State>) => void; data: Data }
export const AppCtx = createContext<Ctx>(null!)
export const useApp = () => useContext(AppCtx)

export function useNow(ms: number) {
  const [n, setN] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setN(new Date()), ms); return () => clearInterval(t) }, [ms])
  return n
}
export const uid = () => crypto.randomUUID()
