export interface Ev { course: string; title: string; day: number; start: string; end: string; room: string; staff: string }
/** @deprecated Use EventRec from events.ts instead. Kept for legacy migration only. */
export interface Own { id: string; course: string; title: string; date: string; start: string; end: string }
export interface Data { courses: Record<string, { name: string; color: string }>; schedules: Record<string, Ev[]> }
export interface Task { id: string; t: string; c: string; done: boolean }
export interface State { 
  name: string; 
  /** Unique handle/username, e.g. 'tls123'. */
  username: string;
  group: number; 
  section: number; 
  /** Academic faculty id, e.g. 'foe'. Empty string = not yet set. */
  faculty: string;
  /** Academic level, e.g. 1. 0 = not yet set. */
  level: number;
  /** Student code / ID, e.g. '120260123'. */
  code: string;
  theme: 'dark' | 'light'; 
  lang: 'en' | 'ja' | 'ro'; 
  tasks: Task[]; 
  /** @deprecated Legacy personal events. Migrated to IndexedDB on first run. */
  mine: Own[] 
}
export interface Session { sid: string; ts: number; m: number; subj: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function isData(v: unknown): v is Data {
  if (!isObj(v) || !isObj(v.courses) || !isObj(v.schedules)) return false
  return Object.values(v.schedules).every(
    a => Array.isArray(a) && a.every(e => isObj(e) && typeof e.course === 'string' && typeof e.day === 'number' && typeof e.start === 'string' && typeof e.end === 'string')
  )
}
