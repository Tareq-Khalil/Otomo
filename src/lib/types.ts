export interface Ev { course: string; title: string; day: number; start: string; end: string; room: string; staff: string }
export interface Own { id: string; course: string; title: string; date: string; start: string; end: string }
export interface Data { courses: Record<string, { name: string; color: string }>; schedules: Record<string, Ev[]> }
export interface Task { id: string; t: string; c: string; done: boolean }
export interface State { name: string; group: number; section: number; theme: 'dark' | 'light'; tasks: Task[]; mine: Own[] }
export interface Session { sid: string; ts: number; m: number; subj: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
/** the timetable file is untrusted input: check its shape before the app touches it */
export function isData(v: unknown): v is Data {
  if (!isObj(v) || !isObj(v.courses) || !isObj(v.schedules)) return false
  return Object.values(v.schedules).every(
    a => Array.isArray(a) && a.every(e => isObj(e) && typeof e.course === 'string' && typeof e.day === 'number' && typeof e.start === 'string' && typeof e.end === 'string')
  )
}
