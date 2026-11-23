/**
 * Otomo-chan Offline Knowledge & Heuristic Intelligence Engine
 *
 * Runs 100% locally with 0 MB download and zero GPU requirement.
 * Used when:
 * 1. WebGPU is unavailable on the device (older phones/laptops)
 * 2. The user has not downloaded a local neural model yet
 * 3. The device has limited memory (under 4 GB)
 *
 * Provides intelligent, personality-infused responses covering:
 * - Student's timetable, current class, and up next
 * - Tasks, assignments, and study priorities
 * - Focus timer controls and Pomodoro status
 * - Academic guidance (math, physics, CS, algorithms)
 * - University procedures and exam preparation tips
 * - Clear guidance when a question needs the downloaded language model
 */

import type { State, Data } from '@/lib/types'
import { executeTool, type ToolContext } from './tools'

interface FallbackParams {
  userMessage: string
  state: State
  data: Data
  owner: string
  studentName?: string
  onChunk?: (chunk: string, full: string) => void
  signal?: AbortSignal
}

export async function generateFallbackResponse({
  userMessage,
  state,
  data,
  owner,
  onChunk,
  signal
}: FallbackParams): Promise<string> {
  const query = userMessage.toLowerCase().trim()
  const name = state.name ? state.name.split(' ')[0] : 'friend'
  const ctx: ToolContext = { state, data, owner }

  let fullResponse = ''

  // Helper to stream chunks
  const emit = async (text: string) => {
    fullResponse = text
    if (onChunk) {
      // Simulate natural streaming cadence
      const words = text.split(' ')
      let streamed = ''
      for (const word of words) {
        if (signal?.aborted) break
        streamed += (streamed ? ' ' : '') + word
        onChunk(word + ' ', streamed)
        await new Promise(r => setTimeout(r, 18))
      }
    }
  }

  // 1. Timetable / Schedule Queries
  if (
    query.includes('schedule') ||
    query.includes('class') ||
    query.includes('lecture') ||
    query.includes('timetable') ||
    query.includes('today') && query.includes('what') ||
    query.includes('tomorrow')
  ) {
    const dayMatch = query.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
    const targetDay = dayMatch ? dayMatch[1].toLowerCase() : undefined

    const toolRes = await executeTool('lookup_schedule', { day: targetDay }, ctx)
    if (toolRes.success && toolRes.data) {
      const scheduleData = toolRes.data as { day?: string; events?: { course: string; courseName: string; time: string; room: string; staff: string }[] }
      if (scheduleData.events && scheduleData.events.length > 0) {
        const list = scheduleData.events
          .map(e => `• **${e.course}** (${e.courseName})\n  Time: \`${e.time}\` · Room: **${e.room || 'TBA'}** · Instructor: ${e.staff || 'Staff'}`)
          .join('\n\n')
        await emit(`Here is your schedule for **${scheduleData.day ? scheduleData.day.toUpperCase() : 'your selected day'}**, ${name}:\n\n${list}\n\nMake sure to arrive a few minutes early! If you need notes or revision on any of these topics, just let me know.`)
        return fullResponse
      } else {
        await emit(`You don't have any classes scheduled for that day, ${name}! Take advantage of the free time to catch up on assignments or relax a bit. Yasumi! 休み`)
        return fullResponse
      }
    }
  }

  // 2. Tasks & Assignments Queries
  if (
    query.includes('task') ||
    query.includes('todo') ||
    query.includes('assignment') ||
    query.includes('homework') ||
    query.includes('deadline')
  ) {
    const toolRes = await executeTool('lookup_tasks', { status: 'todo' }, ctx)
    if (toolRes.success && toolRes.data) {
      const taskData = toolRes.data as { count: number; tasks: { title: string; priority: string; dueDate: string | null }[] }
      if (taskData.count > 0) {
        const taskList = taskData.tasks
          .map(t => `• **${t.title}** ${t.dueDate ? `(Due: ${t.dueDate})` : ''} — *Priority: ${t.priority}*`)
          .join('\n')
        await emit(`You currently have **${taskData.count}** pending task${taskData.count > 1 ? 's' : ''}, ${name}:\n\n${taskList}\n\nShall we start a 25-minute Pomodoro session to knock one of these out?`)
        return fullResponse
      } else {
        await emit(`Splendid! You have no open tasks right now, ${name}. Everything is clear! You've been very diligent. ✨`)
        return fullResponse
      }
    }
  }

  // 3. Focus / Pomodoro Timer Queries
  if (
    query.includes('focus') ||
    query.includes('pomodoro') ||
    query.includes('timer') ||
    query.includes('study session')
  ) {
    const toolRes = await executeTool('focus_timer_status', {}, ctx)
    if (toolRes.success && toolRes.data) {
      const timer = toolRes.data as { status: string; subject?: string; remainingMinutes?: number; paused?: boolean }
      if (timer.status === 'focus') {
        await emit(`You are currently in a **${timer.subject || 'study'}** focus session with approximately **${timer.remainingMinutes} minutes** remaining${timer.paused ? ' (currently paused)' : ''}. Stay concentrated — you've got this!`)
        return fullResponse
      } else if (timer.status === 'break' || timer.status === 'long') {
        await emit(`You're on a well-deserved break right now (${timer.remainingMinutes} minutes left). Hydrate, stretch, and step away from the screen for a moment!`)
        return fullResponse
      } else {
        await emit(`The focus timer is currently idle. Whenever you are ready to study, head over to the **Focus** tab or let me know what subject we should tackle!`)
        return fullResponse
      }
    }
  }

  // 4. Academic Explanations & Concepts
  if (
    query.includes('explain') ||
    query.includes('how does') ||
    query.includes('what is') ||
    query.includes('derivative') ||
    query.includes('integral') ||
    query.includes('algorithm') ||
    query.includes('recursion') ||
    query.includes('binary search')
  ) {
    if (query.includes('binary search')) {
      await emit(`**Binary Search** is an efficient $O(\\log n)$ search algorithm for sorted arrays.\n\n### How it works:\n1. Compare the target with the middle element: $mid = \\lfloor(low + high) / 2\\rfloor$.\n2. If $target == arr[mid]$, you found it!\n3. If $target < arr[mid]$, eliminate the right half: $high = mid - 1$.\n4. If $target > arr[mid]$, eliminate the left half: $low = mid + 1$.\n\n### Python Implementation:\n\`\`\`python\ndef binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\`\`\`\nWould you like me to walk through an example trace?`)
      return fullResponse
    }

    if (query.includes('derivative')) {
      await emit(`In calculus, the **derivative** measures the sensitivity to change of a function value with respect to a change in its argument.\n\nFormally defined as the limit of the difference quotient:\n$$\\frac{df}{dx} = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$\n\nGeometrically, it corresponds to the **slope of the tangent line** to the curve $y = f(x)$ at point $x$.\n\nCommon rules to remember:\n• **Power Rule**: $\\frac{d}{dx}[x^n] = n x^{n-1}$\n• **Product Rule**: $(uv)' = u'v + uv'$\n• **Chain Rule**: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$`)
      return fullResponse
    }
  }

  // 5. Arabic Greeting or Query
  const isArabic = /[\u0600-\u06FF]/.test(query)
  if (isArabic) {
    await emit(`أهلاً بك يا ${name}! أنا أوتومو-تشان، رفيقتك الذكية في الدراسة. يمكنني مساعدتك في جدول المحاضرات، إدارة المهام، التحضير للامتحانات، وشرح المفاهيم الأكاديمية خطوة بخطوة. كيف يمكنني دعمك اليوم؟`)
    return fullResponse
  }

  // 6. Greetings & Casual Inquiries
  if (
    /^(hi|hello|hey)\b/.test(query) ||
    query.includes('konnichiwa') ||
    query.includes('ohayo')
  ) {
    await emit(`Konnichiwa, ${name}! Great to see you. I'm ready to assist with your courses, timetable, tasks, or any subject you're working on. What are we focusing on today?`)
    return fullResponse
  }

  // 7. Be explicit about the limits of this rule-based fallback instead of
  // implying that it understood an unsupported question.
  await emit(`I'm in Quick Offline Mode, ${name}. This built-in helper can look up your timetable, tasks, and focus timer, but it doesn't have a full language model for open-ended questions.\n\nTry asking “What classes do I have today?”, “Show my tasks”, or “What's my focus timer status?”. To chat freely while offline, connect to the internet and load Qwen once from Model Settings; after its files finish downloading, you can use the model without internet.`)
  return fullResponse
}
