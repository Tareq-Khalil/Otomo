import type { Data, Ev, Own, State } from './types'
import { iso, mins, addDays } from './time'
import type { EventRec } from './events'
import { getExamForDate, getRoomForCode, isMidtermWeek, type ExamData } from './exams'

export type Row = Ev & {
  own?: Own
  ownEventId?: string
  isExam?: boolean
  subtitle?: string | null
}

const GREY = '#8d8675'

export function info(data: Data, label: string) {
  const keys = label
    .split('/')
    .map(p => p.trim().toLowerCase())
    .map(p => Object.keys(data.courses).find(k => k.toLowerCase() === p || data.courses[k].name.toLowerCase() === p))

  if (!keys.length || !keys.every(Boolean)) return { name: label, color: GREY }
  return {
    name: keys.map(k => data.courses[k!].name).join(' / '),
    color: data.courses[keys[0]!].color
  }
}

export const forSection = (data: Data, sec: number): Ev[] => data.schedules[String(sec)] ?? []

export function eventsOn(
  s: State,
  data: Data,
  d: Date,
  dbEvents?: EventRec[],
  examData?: ExamData | null
): Row[] {
  const dIso = iso(d)
  const isMidterm = isMidtermWeek(examData ?? null, dIso)

  // 1. Regular classes: only active if NOT during midterm week
  const regularClasses: Row[] = isMidterm
    ? []
    : forSection(data, s.section).filter(e => e.day === d.getDay())

  // 2. Midterm exam for this date, if any
  const exam = getExamForDate(examData ?? null, dIso)
  const examRows: Row[] = []
  if (exam) {
    const assignedRoom = s.code ? getRoomForCode(exam, s.code) : null
    const roomStr = assignedRoom
      ? `B18 · Room ${assignedRoom}`
      : 'B18 · Room by Student ID'

    examRows.push({
      course: exam.courseCode,
      title: 'Midterm Exam (中間試験)',
      subtitle: exam.subtitle,
      day: d.getDay(),
      start: examData?.defaultTime.start ?? '09:00',
      end: examData?.defaultTime.end ?? '10:15',
      room: roomStr,
      staff: exam.instructor,
      isExam: true
    })
  }

  // 3. User's personal events: read from IndexedDB events if supplied, else fallback to legacy s.mine
  const personalRows: Row[] = dbEvents
    ? dbEvents
        .filter(m => !m.deletedAt && m.date === dIso)
        .map(m => ({
          course: m.title,
          title: 'Personal',
          day: d.getDay(),
          start: m.startTime,
          end: m.endTime,
          room: '',
          staff: '',
          ownEventId: m.id
        }))
    : (s.mine ?? [])
        .filter(m => m.date === dIso)
        .map(m => ({
          course: m.course,
          title: m.title,
          day: d.getDay(),
          start: m.start,
          end: m.end,
          room: '',
          staff: '',
          own: m
        }))

  return [...regularClasses, ...examRows, ...personalRows].sort(
    (a, b) => mins(a.start) - mins(b.start)
  )
}

export function nextClass(
  s: State,
  data: Data,
  n: Date,
  dbEvents?: EventRec[],
  examData?: ExamData | null
) {
  const nm = n.getHours() * 60 + n.getMinutes()
  for (let i = 0; i < 7; i++) {
    const d = addDays(n, i)
    const evs = eventsOn(s, data, d, dbEvents, examData)
    if (i === 0) {
      const cur = evs.find(e => mins(e.start) <= nm && nm < mins(e.end))
      if (cur) return { e: cur, i, d, now: true, nm }
      const nx = evs.find(e => mins(e.start) > nm)
      if (nx) return { e: nx, i, d, now: false, nm }
    } else if (evs.length) {
      return { e: evs[0], i, d, now: false, nm }
    }
  }
  return null
}
