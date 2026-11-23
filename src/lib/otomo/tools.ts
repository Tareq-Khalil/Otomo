/**
 * Otomo-chan Secure Tool Registry
 *
 * Provides a validated set of capabilities that the AI model can invoke.
 * Tools are registered with:
 * - A unique name
 * - A description (for the system prompt)
 * - A typed parameter schema
 * - An execution function
 *
 * SECURITY: Tools validate all arguments. The AI model CANNOT execute
 * arbitrary SQL, modify other students' data, or access admin functions.
 */

import type { Data, State } from '@/lib/types'
import { listTasks as idbListTasks } from '@/lib/tasks'

// ─── Tool Definition ───────────────────────────────────────────────────────

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

// ─── Built-in Tools ────────────────────────────────────────────────────────

const lookupSchedule: ToolDefinition = {
  name: 'lookup_schedule',
  description: 'Look up the student\'s class schedule for a specific day or the full week.',
  parameters: {
    day: { type: 'string', description: 'Day of the week (e.g. "monday", "tuesday"). Omit for full week.' }
  },
  async execute(args, ctx) {
    const { data, state } = ctx
    const key = `${state.faculty || 'foe'}_L${state.level || 1}_G${state.group || 1}_S${state.section || 1}`
    const schedule = data.schedules[key]

    if (!schedule) {
      return { success: true, data: { message: 'No schedule found for the student\'s section.' } }
    }

    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    }

    if (args.day && typeof args.day === 'string') {
      const dayNum = dayMap[args.day.toLowerCase()]
      if (dayNum === undefined) return { success: false, error: 'Invalid day name.' }
      const dayEvents = schedule.filter(e => e.day === dayNum)
      return {
        success: true,
        data: {
          day: args.day,
          events: dayEvents.map(e => ({
            course: e.course,
            courseName: data.courses[e.course]?.name || e.course,
            title: e.title,
            time: `${e.start} - ${e.end}`,
            room: e.room,
            staff: e.staff
          }))
        }
      }
    }

    // Full week
    const weekSchedule: Record<string, unknown[]> = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    for (const e of schedule) {
      const dayName = dayNames[e.day] || `Day ${e.day}`
      if (!weekSchedule[dayName]) weekSchedule[dayName] = []
      weekSchedule[dayName].push({
        course: data.courses[e.course]?.name || e.course,
        title: e.title,
        time: `${e.start} - ${e.end}`,
        room: e.room
      })
    }
    return { success: true, data: weekSchedule }
  }
}

const lookupTasks: ToolDefinition = {
  name: 'lookup_tasks',
  description: 'View the student\'s current tasks filtered by status.',
  parameters: {
    status: { type: 'string', description: 'Filter by status: "todo", "doing", "done", or "all". Defaults to "all".' }
  },
  async execute(args, ctx) {
    try {
      const tasks = await idbListTasks(ctx.owner)
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
    } catch {
      return { success: false, error: 'Could not access tasks.' }
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
      if (!raw) return { success: true, data: { status: 'No study session data found.' } }
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

// ─── Tool Registry ─────────────────────────────────────────────────────────

const registry = new Map<string, ToolDefinition>()

function registerTool(tool: ToolDefinition) {
  registry.set(tool.name, tool)
}

// Register built-in tools
registerTool(lookupSchedule)
registerTool(lookupTasks)
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
