/**
 * Otomo-chan Secure Tool Registry
 *
 * Provides a validated set of capabilities that Otomo-chan can invoke
 * both in Quick Offline Mode and as live context for the WebGPU model.
 */

import type { Data, State } from '@/lib/types'
import { createTask as idbCreateTask, listTasks as idbListTasks } from '@/lib/tasks'
import { listEvents as idbListEvents } from '@/lib/events'
import { eventsOn, info } from '@/lib/schedule'
import { getRoomForCode, isMidtermWeek, type ExamData } from '@/lib/exams'
import { addDays, iso } from '@/lib/time'

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string; required?: boolean }>
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>
}

export interface ToolContext {
  state: State
  data: Data
  owner: string
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

const BUILTIN_KNOWLEDGE = [
  {
    title: 'E-JUST FOE Academic Regulations (Level 1–4)',
    faculty: 'foe',
    tags: ['regulations', 'grading', 'credits', 'gpa', 'pass'],
    content:
      'The credit-hour system requires 140 credit hours for graduation in Engineering. The minimum passing grade for a course is D (50%). Midterm exams typically account for 20–30% of the total course grade.'
  },
  {
    title: 'Midterm & Final Examination Rules',
    faculty: 'all',
    tags: ['exams', 'midterms', 'building 18', 'rules', 'id'],
    content:
      'Students must carry their university ID card at all times and arrive at least 15 minutes before the exam starts. Midterm halls are in Building 18 (assigned by student code), and mobile phones are strictly prohibited inside examination halls.'
  },
  {
    title: 'Pomodoro Focus Method in Otomo',
    faculty: 'all',
    tags: ['focus', 'pomodoro', 'study', 'timer'],
    content:
      'Otomo uses 25-minute focus rounds followed by 5-minute breaks (and a 15-minute long break after 4 cycles). You can pick your course subject in the Focus tab.'
  }
]

async function loadExamDataForState(state: State): Promise<ExamData | null> {
  const faculty = state.faculty || 'foe'
  const level = state.level || 1
  const lsKey = `uh:exams:${faculty}:${level}`
  try {
    const cached = JSON.parse(localStorage.getItem(lsKey) ?? 'null') as ExamData | null
    if (cached && Array.isArray(cached.exams)) return cached
  } catch {
    // Ignore cache parse error
  }
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}exams-${faculty}-l${level}.json`, { cache: 'no-cache' })
    if (!res.ok) return null
    const json = (await res.json()) as ExamData
    if (json && Array.isArray(json.exams)) return json
  } catch {
    // Offline or unavailable
  }
  return null
}

const lookupSchedule: ToolDefinition = {
  name: 'lookup_schedule',
  description: "Look up the student's class schedule, personal events, and exams for a specific day or the full week.",
  parameters: {
    day: { type: 'string', description: 'Day of the week (e.g. "monday", "tomorrow", "today"). Omit for full week.' }
  },
  async execute(args, ctx) {
    const { data, state } = ctx
    const [dbEvents, examData] = await Promise.all([
      idbListEvents().catch(() => []),
      loadExamDataForState(state)
    ])

    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    if (args.day && typeof args.day === 'string') {
      const lower = args.day.toLowerCase()
      let targetDate = new Date()
      if (lower === 'tomorrow') {
        targetDate = addDays(targetDate, 1)
      } else if (lower !== 'today') {
        const dayNum = dayMap[lower]
        if (dayNum === undefined) return { success: false, error: 'Invalid day name.' }
        const diff = (dayNum - targetDate.getDay() + 7) % 7
        targetDate = addDays(targetDate, diff)
      }

      const rows = eventsOn(state, data, targetDate, dbEvents, examData)
      return {
        success: true,
        data: {
          day: dayNames[targetDate.getDay()],
          date: iso(targetDate),
          isMidtermWeek: isMidtermWeek(examData, iso(targetDate)),
          events: rows.map(e => ({
            day: dayNames[e.day],
            course: e.course,
            courseName: e.ownEventId || e.own ? e.course : e.isExam ? `${e.course} Midterm` : info(data, e.course).name,
            title: e.title,
            time: `${e.start} - ${e.end}`,
            room: e.room,
            staff: e.staff,
            isExam: Boolean(e.isExam),
            isPersonal: Boolean(e.ownEventId || e.own)
          }))
        }
      }
    }

    // Next 7 days starting today
    const allEvents: {
      day: string
      date: string
      course: string
      courseName: string
      title: string
      time: string
      room: string
      staff: string
      isExam: boolean
    }[] = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i)
      const rows = eventsOn(state, data, d, dbEvents, examData)
      for (const e of rows) {
        allEvents.push({
          day: dayNames[d.getDay()],
          date: iso(d),
          course: e.course,
          courseName: e.ownEventId || e.own ? e.course : e.isExam ? `${e.course} Midterm` : info(data, e.course).name,
          title: e.title,
          time: `${e.start} - ${e.end}`,
          room: e.room,
          staff: e.staff,
          isExam: Boolean(e.isExam)
        })
      }
    }

    return { success: true, data: { events: allEvents } }
  }
}

const lookupTasks: ToolDefinition = {
  name: 'lookup_tasks',
  description: "View the student's current tasks filtered by status.",
  parameters: {
    status: { type: 'string', description: 'Filter by status: "todo", "doing", "done", or "all". Defaults to "all".' }
  },
  async execute(args) {
    try {
      const tasks = await idbListTasks()
      const active = tasks.filter(t => !t.deletedAt)
      let filtered = active

      if (args.status && typeof args.status === 'string' && args.status !== 'all') {
        const validStatuses = ['todo', 'doing', 'done']
        if (!validStatuses.includes(args.status)) {
          return { success: false, error: 'Invalid status. Use "todo", "doing", "done", or "all".' }
        }
        filtered = active.filter(t => t.status === args.status)
      }

      return {
        success: true,
        data: {
          count: filtered.length,
          tasks: filtered.slice(0, 20).map(t => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            category: t.category
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Could not access tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

const createTaskTool: ToolDefinition = {
  name: 'create_task',
  description: 'Create a new task in the student task list.',
  parameters: {
    title: { type: 'string', description: 'Short task title', required: true },
    dueDate: { type: 'string', description: 'Optional YYYY-MM-DD due date' },
    priority: { type: 'string', description: 'low | normal | high | urgent' },
    category: { type: 'string', description: 'Optional course or category' }
  },
  async execute(args) {
    const title = typeof args.title === 'string' ? args.title.trim() : ''
    if (!title) return { success: false, error: 'Task title is required.' }
    const validPrio = ['low', 'normal', 'high', 'urgent'].includes(String(args.priority))
      ? (args.priority as 'low' | 'normal' | 'high' | 'urgent')
      : 'normal'
    const dueDate = typeof args.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.dueDate) ? args.dueDate : null
    const category = typeof args.category === 'string' && args.category.trim() ? args.category.trim() : null

    const created = await idbCreateTask({
      title,
      dueDate,
      priority: validPrio,
      category
    })
    return {
      success: true,
      data: { id: created.id, title: created.title, dueDate: created.dueDate, priority: created.priority }
    }
  }
}

const lookupExams: ToolDefinition = {
  name: 'lookup_exams',
  description: 'Look up upcoming midterm exams and personalized Building 18 room assignments.',
  parameters: {},
  async execute(_args, ctx) {
    const examData = await loadExamDataForState(ctx.state)
    if (!examData) {
      return { success: true, data: { exams: [], message: 'No exam schedule available for your faculty/level yet.' } }
    }
    const today = iso(new Date())
    const upcoming = examData.exams.filter(e => e.date >= today)
    const list = (upcoming.length ? upcoming : examData.exams).map(e => ({
      courseCode: e.courseCode,
      courseName: e.courseName,
      subtitle: e.subtitle,
      date: e.date,
      time: `${examData.defaultTime.start} - ${examData.defaultTime.end}`,
      room: ctx.state.code ? getRoomForCode(e, ctx.state.code) : null,
      instructor: e.instructor
    }))
    return {
      success: true,
      data: {
        term: examData.term,
        building: examData.building,
        midtermWeek: examData.midtermWeek,
        exams: list
      }
    }
  }
}

const queryKnowledge: ToolDefinition = {
  name: 'query_knowledge',
  description: 'Search university regulations, grading rules, and exam guidelines.',
  parameters: {
    query: { type: 'string', description: 'Search keywords', required: true }
  },
  async execute(args) {
    const q = typeof args.query === 'string' ? args.query.toLowerCase() : ''
    const matches = BUILTIN_KNOWLEDGE.filter(doc =>
      !q ||
      doc.title.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q) ||
      doc.tags.some(t => q.includes(t))
    )
    return {
      success: true,
      data: { documents: matches.length ? matches : BUILTIN_KNOWLEDGE }
    }
  }
}

const focusTimerStatus: ToolDefinition = {
  name: 'focus_timer_status',
  description: 'Check the current status of the Pomodoro focus timer.',
  parameters: {},
  async execute() {
    try {
      const raw = localStorage.getItem('uh:study')
      if (!raw) return { success: true, data: { status: 'idle', message: 'No active focus session.' } }
      const study = JSON.parse(raw) as { run: { kind: string; dur: number; end: number; left?: number; subj: string } | null; cyc: number; subj: string }

      if (!study.run) {
        return { success: true, data: { status: 'idle', message: 'No active focus session.', subject: study.subj } }
      }

      const { run } = study
      const remaining = run.left ?? Math.max(0, run.end - Date.now())
      return {
        success: true,
        data: {
          status: run.kind,
          subject: run.subj,
          remainingMinutes: Math.round(remaining / 60000),
          paused: run.left !== undefined,
          cycle: study.cyc
        }
      }
    } catch {
      return { success: false, error: 'Could not read focus timer data.' }
    }
  }
}

const registry = new Map<string, ToolDefinition>()

function registerTool(tool: ToolDefinition) {
  registry.set(tool.name, tool)
}

registerTool(lookupSchedule)
registerTool(lookupTasks)
registerTool(createTaskTool)
registerTool(lookupExams)
registerTool(queryKnowledge)
registerTool(focusTimerStatus)

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name)
}

export function listToolNames(): string[] {
  return Array.from(registry.keys())
}

export function getToolDescriptions(enabledTools: string[]): string {
  return enabledTools
    .map(name => {
      const tool = registry.get(name)
      if (!tool) return null
      return `${tool.name}: ${tool.description}`
    })
    .filter(Boolean)
    .join('\n')
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const tool = registry.get(name)
  if (!tool) return { success: false, error: `Unknown tool: ${name}` }

  try {
    return await tool.execute(args, context)
  } catch (err) {
    return { success: false, error: `Tool execution failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

/**
 * Builds a concise, accurate real-time snapshot of the student's Otomo state
 * so the local WebGPU LLM can answer schedule/task/exam/focus questions truthfully.
 */
export async function buildLiveAppContext(ctx: ToolContext, enabledTools: string[]): Promise<string> {
  const parts: string[] = []
  const enabled = new Set(enabledTools)

  if (enabled.has('lookup_schedule')) {
    const res = await executeTool('lookup_schedule', { day: 'today' }, ctx)
    if (res.success && res.data) {
      const d = res.data as { day: string; events: { courseName: string; title: string; time: string; room: string }[] }
      if (d.events.length > 0) {
        parts.push(
          `Today's schedule (${d.day}):\n` +
          d.events.map(e => `- ${e.courseName} (${e.title}) at ${e.time}${e.room ? ` in ${e.room}` : ''}`).join('\n')
        )
      } else {
        parts.push(`Today's schedule (${d.day}): No classes, exams, or personal events scheduled.`)
      }
    }
  }

  if (enabled.has('lookup_tasks')) {
    const res = await executeTool('lookup_tasks', { status: 'todo' }, ctx)
    if (res.success && res.data) {
      const d = res.data as { count: number; tasks: { title: string; priority: string; dueDate: string | null }[] }
      if (d.count > 0) {
        parts.push(
          `Open tasks (${d.count}):\n` +
          d.tasks.slice(0, 8).map(t => `- ${t.title} [${t.priority}${t.dueDate ? `, due ${t.dueDate}` : ''}]`).join('\n')
        )
      } else {
        parts.push('Open tasks: None.')
      }
    }
  }

  if (enabled.has('lookup_exams')) {
    const res = await executeTool('lookup_exams', {}, ctx)
    if (res.success && res.data) {
      const d = res.data as { exams: { courseCode: string; date: string; room: string | null }[] }
      if (d.exams.length > 0) {
        parts.push(
          'Upcoming exams:\n' +
          d.exams.slice(0, 5).map(e => `- ${e.courseCode} on ${e.date}${e.room ? ` (Room ${e.room})` : ''}`).join('\n')
        )
      }
    }
  }

  if (enabled.has('focus_timer_status')) {
    const res = await executeTool('focus_timer_status', {}, ctx)
    if (res.success && res.data) {
      const d = res.data as { status: string; subject?: string; remainingMinutes?: number; paused?: boolean }
      parts.push(
        d.status === 'idle'
          ? 'Focus timer: Idle.'
          : `Focus timer: ${d.status} (${d.subject || 'General'}), ${d.remainingMinutes ?? 0} min left${d.paused ? ' (paused)' : ''}.`
      )
    }
  }

  return parts.join('\n\n')
}
