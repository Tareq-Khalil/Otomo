import type { Data, Ev, Own, State } from './types'
import { iso, mins, addDays } from './time'

export type Row = Ev & { own?: Own }
const GREY = '#8d8675'

export function info(data: Data, label: string) {
  const keys = label.split('/').map(p => p.trim().toLowerCase())
    .map(p => Object.keys(data.courses).find(k => k.toLowerCase() === p || data.courses[k].name.toLowerCase() === p))
  if (!keys.length || !keys.every(Boolean)) return { name: label, color: GREY }
  return { name: keys.map(k => data.courses[k!].name).join(' / '), color: data.courses[keys[0]!].color }
}

export const forSection = (data: Data, sec: number): Ev[] => data.schedules[String(sec)] ?? []

export function eventsOn(s: State, data: Data, d: Date): Row[] {
  const own: Row[] = s.mine.filter(m => m.date === iso(d)).map(m => ({ course: m.course, title: m.title, day: d.getDay(), start: m.start, end: m.end, room: '', staff: '', own: m }))
  return [...forSection(data, s.section).filter(e => e.day === d.getDay()), ...own].sort((a, b) => mins(a.start) - mins(b.start))
}

export function nextClass(s: State, data: Data, n: Date) {
  const nm = n.getHours() * 60 + n.getMinutes()
  for (let i = 0; i < 7; i++) {
    const d = addDays(n, i), evs = eventsOn(s, data, d)
    if (i === 0) {
      const cur = evs.find(e => mins(e.start) <= nm && nm < mins(e.end)); if (cur) return { e: cur, i, d, now: true, nm }
      const nx = evs.find(e => mins(e.start) > nm); if (nx) return { e: nx, i, d, now: false, nm }
    } else if (evs.length) return { e: evs[0], i, d, now: false, nm }
  }
  return null
}
