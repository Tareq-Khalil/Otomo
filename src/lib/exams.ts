import { useCallback, useEffect, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExamRoom {
  room: string
  from: string
  to: string
}

export interface Exam {
  id: string
  courseCode: string
  courseName: string
  subtitle: string | null
  date: string          // YYYY-MM-DD
  instructor: string
  rooms: ExamRoom[]
}

export interface ExamData {
  faculty: string
  level: number
  term: string
  building: string
  defaultTime: { start: string; end: string }
  midtermWeek: { start: string; end: string }
  exams: Exam[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the exam scheduled on a given date, or null if none.
 * `date` is a YYYY-MM-DD string.
 */
export function getExamForDate(data: ExamData | null, date: string): Exam | null {
  if (!data) return null
  return data.exams.find(e => e.date === date) ?? null
}

/**
 * Returns whether a given date falls within the midterm week.
 */
export function isMidtermWeek(data: ExamData | null, date: string): boolean {
  if (!data) return false
  return date >= data.midtermWeek.start && date <= data.midtermWeek.end
}

/**
 * Given a student code (numeric string like "120260123"),
 * returns the room label for a specific exam, or null if not found.
 */
export function getRoomForCode(exam: Exam, studentCode: string): string | null {
  const code = studentCode.replace(/\D/g, '')  // keep digits only
  if (!code) return null
  const num = parseInt(code, 10)
  if (isNaN(num)) return null
  for (const r of exam.rooms) {
    const lo = parseInt(r.from, 10)
    const hi = parseInt(r.to, 10)
    if (num >= lo && num <= hi) return r.room
  }
  return null
}

/**
 * Returns the exam file URL for a given faculty/level combination.
 */
function examFileUrl(faculty: string, level: number): string {
  return `${import.meta.env.BASE_URL}exams-${faculty}-l${level}.json`
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const LS_KEY = (f: string, l: number) => `uh:exams:${f}:${l}`

/**
 * Loads and caches the exam schedule for a faculty/level combination.
 * Uses localStorage as an offline cache (like data.json).
 * Returns null while loading or if the faculty/level has no exam file.
 */
export function useExams(faculty: string, level: number): {
  examData: ExamData | null
  loading: boolean
  failed: boolean
} {
  const key = LS_KEY(faculty, level)

  const [examData, setExamData] = useState<ExamData | null>(() => {
    if (!faculty || !level) return null
    try {
      const cached = JSON.parse(localStorage.getItem(key) ?? 'null')
      return isExamData(cached) ? cached : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(!examData && !!faculty && !!level)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    if (!faculty || !level) return
    try {
      const r = await fetch(examFileUrl(faculty, level), { cache: 'no-cache' })
      if (!r.ok) { setFailed(true); return }
      const json: unknown = await r.json()
      if (!isExamData(json)) { setFailed(true); return }
      setExamData(json)
      setFailed(false)
      try { localStorage.setItem(key, JSON.stringify(json)) } catch { /* storage full */ }
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [faculty, level, key])

  useEffect(() => {
    void load()
    const handleOnline = () => void load()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [load])

  return { examData, loading, failed }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isExamData(v: unknown): v is ExamData {
  if (!isObj(v)) return false
  if (typeof v.faculty !== 'string' || typeof v.level !== 'number') return false
  if (!isObj(v.defaultTime) || !isObj(v.midtermWeek)) return false
  if (!Array.isArray(v.exams)) return false
  return v.exams.every(e =>
    isObj(e) &&
    typeof e.id === 'string' &&
    typeof e.courseCode === 'string' &&
    typeof e.courseName === 'string' &&
    typeof e.date === 'string' &&
    Array.isArray(e.rooms) &&
    e.rooms.every((r: unknown) => isObj(r) && typeof (r as unknown as ExamRoom).room === 'string')
  )
}

