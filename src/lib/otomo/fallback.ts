/**
 * Otomo-chan Offline Knowledge & Heuristic Intelligence Engine
 *
 * Runs 100% locally with 0 MB download and zero GPU requirement.
 * Uses real app tools (schedule, personal events, exams, tasks, focus timer,
 * E-JUST knowledge), recent conversation history, and Otomo-chan's personality.
 */

import type { State, Data } from '@/lib/types'
import { executeTool, type ToolContext } from './tools'

interface HistoryMsg {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface FallbackParams {
  userMessage: string
  state: State
  data: Data
  owner: string
  history?: HistoryMsg[]
  onChunk?: (chunk: string, full: string) => void
  signal?: AbortSignal
}

function getLastAssistantTopic(history: HistoryMsg[]): string {
  const prev = [...history].reverse().find(m => m.role === 'assistant')?.content.toLowerCase() ?? ''
  if (prev.includes('binary search')) return 'binary_search'
  if (prev.includes('derivative')) return 'derivative'
  if (prev.includes('integral')) return 'integral'
  if (prev.includes('recursion')) return 'recursion'
  if (prev.includes('pomodoro')) return 'tasks'
  return ''
}

export async function generateFallbackResponse({
  userMessage,
  state,
  data,
  owner,
  history = [],
  onChunk,
  signal
}: FallbackParams): Promise<string> {
  const query = userMessage.toLowerCase().trim()
  const name = state.name ? state.name.split(' ')[0] : 'friend'
  const ctx: ToolContext = { state, data, owner }

  let fullResponse = ''

  const emit = async (text: string) => {
    fullResponse = text
    if (onChunk) {
      const words = text.split(' ')
      let streamed = ''
      for (const word of words) {
        if (signal?.aborted) break
        streamed += (streamed ? ' ' : '') + word
        onChunk(word + ' ', streamed)
        await new Promise(r => setTimeout(r, 12))
      }
    }
  }

  // 0. Handle short conversational follow-ups using recent history
  const lastTopic = getLastAssistantTopic(history)
  if (/^(yes|yeah|yep|sure|ok|okay|please|go ahead|tell me more|example|trace)\b/i.test(query)) {
    if (lastTopic === 'binary_search') {
      await emit(
        `Here is a quick trace on \`arr = [2, 5, 8, 12, 16, 23, 38]\` searching for \`23\`:\n\n` +
        `1. \`low = 0, high = 6\` → \`mid = 3\` (\`arr[3] = 12 < 23\`) → move \`low = 4\`.\n` +
        `2. \`low = 4, high = 6\` → \`mid = 5\` (\`arr[5] = 23 == 23\`) → found at index **5** in just 2 steps.`
      )
      return fullResponse
    }
    if (lastTopic === 'tasks') {
      await emit(`Head to the **Focus** tab whenever you're ready — 25 minutes on one task beats two hours of staring at the whole list, ${name}.`)
      return fullResponse
    }
  }

  // 1. Create a Task directly when asked ("add task ...", "remind me to ...")
  const createMatch = userMessage.match(/^(?:please\s+)?(?:add|create|make|new)\s+(?:a\s+)?task(?:\s+to|\s*:)?\s+(.+)$/i)
    || userMessage.match(/^(?:please\s+)?remind\s+me\s+to\s+(.+)$/i)
  if (createMatch && createMatch[1]?.trim()) {
    const rawTitle = createMatch[1].trim()
    const toolRes = await executeTool('create_task', { title: rawTitle }, ctx)
    if (toolRes.success && toolRes.data) {
      const created = toolRes.data as { title: string }
      await emit(`Done — I added **${created.title}** to your Tasks list, ${name}. One less thing floating around in your head.`)
      return fullResponse
    }
    await emit(`I tried to save that task, but hit a storage issue: ${toolRes.error || 'Unknown error'}.`)
    return fullResponse
  }

  // 2. Exam / Midterm / Building 18 Room Queries
  if (
    query.includes('exam') ||
    query.includes('midterm') ||
    query.includes('building 18') ||
    query.includes('hall') ||
    (query.includes('room') && !query.includes('classroom'))
  ) {
    if (query.includes('tip') || query.includes('revision') || query.includes('prepare')) {
      await emit(
        `Here is a practical midterm revision loop, ${name}:\n\n` +
        `1. Pick one topic and write down everything you recall **without** notes.\n` +
        `2. Open your lecture slides and patch only the gaps.\n` +
        `3. Solve 3–5 past problems timed, without peeking at solutions.\n` +
        `4. Take a 5-minute break before switching subjects.\n\n` +
        `Want me to check your upcoming exam dates and Building 18 rooms? Just ask *"What are my midterm exams?"*`
      )
      return fullResponse
    }

    const toolRes = await executeTool('lookup_exams', {}, ctx)
    if (toolRes.success && toolRes.data) {
      const examData = toolRes.data as {
        term?: string
        building?: string
        exams: { courseCode: string; courseName: string; date: string; time: string; room: string | null; instructor: string }[]
      }
      if (examData.exams.length > 0) {
        const list = examData.exams
          .map(e =>
            `• **${e.courseCode}** (${e.courseName}) — \`${e.date}\` · ${e.time}` +
            (e.room ? ` · **${examData.building || 'B18'} Room ${e.room}**` : ' · Room by Student ID (set your code in Settings)')
          )
          .join('\n')
        await emit(`Here is your exam schedule${examData.term ? ` (${examData.term})` : ''}, ${name}:\n\n${list}\n\nBring your university ID and arrive 15 minutes early.`)
        return fullResponse
      }
      await emit(`I don't see any exam data loaded for your faculty/level yet, ${name}.`)
      return fullResponse
    }
  }

  // 3. Timetable / Schedule Queries (includes regular classes, exams, and personal events)
  if (
    query.includes('schedule') ||
    query.includes('class') ||
    query.includes('lecture') ||
    query.includes('timetable') ||
    (query.includes('today') && (query.includes('what') || query.includes('have'))) ||
    query.includes('tomorrow') ||
    query.includes('next class')
  ) {
    const dayMatch = query.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|today|tomorrow)\b/i)
    const isNextClass = query.includes('next class')
    const targetDay = dayMatch ? dayMatch[1].toLowerCase() : (isNextClass ? undefined : undefined)

    const toolRes = await executeTool('lookup_schedule', { day: targetDay }, ctx)
    if (!toolRes.success) {
      await emit(`I couldn't read your timetable: ${toolRes.error || 'lookup failed'}. Check that your section is set in Settings.`)
      return fullResponse
    }
    if (toolRes.data) {
      const scheduleData = toolRes.data as {
        day?: string
        isMidtermWeek?: boolean
        events?: { day?: string; course: string; courseName: string; title: string; time: string; room: string; staff: string }[]
      }
      if (scheduleData.events && scheduleData.events.length > 0) {
        let events = scheduleData.events
        if (isNextClass) {
          const now = new Date()
          const nowMinutes = now.getHours() * 60 + now.getMinutes()
          const dayNumbers: Record<string, number> = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
          }
          events = events
            .map(event => {
              const start = event.time.match(/^(\d{2}):(\d{2})/)
              const eventDay = event.day ? dayNumbers[event.day.toLowerCase()] : undefined
              const startMinutes = start ? Number(start[1]) * 60 + Number(start[2]) : -1
              let daysAhead = eventDay === undefined ? -1 : (eventDay - now.getDay() + 7) % 7
              if (daysAhead === 0 && startMinutes <= nowMinutes) daysAhead = 7
              return { event, daysAhead, startMinutes }
            })
            .filter(item => item.daysAhead >= 0 && item.startMinutes >= 0)
            .sort((a, b) => a.daysAhead - b.daysAhead || a.startMinutes - b.startMinutes)
            .slice(0, 1)
            .map(item => item.event)
        }
        if (events.length === 0) {
          await emit(`I couldn't find an upcoming class in your timetable, ${name}. Check that your section is set in Settings.`)
          return fullResponse
        }
        const list = events
          .map(e =>
            `${e.day && !scheduleData.day ? `**${e.day}:** ` : ''}• **${e.courseName}** (${e.title})\n  \`${e.time}\`${e.room ? ` · **${e.room}**` : ''}${e.staff ? ` · ${e.staff}` : ''}`
          )
          .join('\n\n')
        const period = isNextClass
          ? 'your next scheduled item'
          : scheduleData.day
            ? `**${scheduleData.day}**`
            : 'your next 7 days'
        await emit(`Here is ${period}, ${name}:\n\n${list}`)
        return fullResponse
      }
      await emit(`Nothing scheduled for ${scheduleData.day || 'that day'}, ${name}. Enjoy the breathing room — or knock out a task early.`)
      return fullResponse
    }
  }

  // 4. Tasks & Assignments Queries
  if (
    query.includes('task') ||
    query.includes('todo') ||
    query.includes('assignment') ||
    query.includes('homework') ||
    query.includes('deadline') ||
    query.includes('due')
  ) {
    const toolRes = await executeTool('lookup_tasks', { status: 'todo' }, ctx)
    if (!toolRes.success) {
      await emit(`I couldn't read your tasks: ${toolRes.error || 'lookup failed'}.`)
      return fullResponse
    }
    if (toolRes.data) {
      const taskData = toolRes.data as { count: number; tasks: { title: string; priority: string; dueDate: string | null }[] }
      if (taskData.count > 0) {
        const taskList = taskData.tasks
          .map(t => `• **${t.title}**${t.dueDate ? ` (Due: ${t.dueDate})` : ''} — *${t.priority}*`)
          .join('\n')
        await emit(
          `You have **${taskData.count}** pending task${taskData.count > 1 ? 's' : ''}, ${name}:\n\n${taskList}\n\n` +
          `Tip: You can also tell me *"Add task Review Physics Ch. 3"* and I'll save it for you.`
        )
        return fullResponse
      }
      await emit(`Zero open tasks right now, ${name}. Either you're remarkably organized or you haven't added them yet.`)
      return fullResponse
    }
  }

  // 5. Focus / Pomodoro Timer Queries
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
        await emit(`You're in a **${timer.subject || 'study'}** focus round with about **${timer.remainingMinutes} min** left${timer.paused ? ' (paused)' : ''}. Keep going.`)
        return fullResponse
      }
      if (timer.status === 'break' || timer.status === 'long') {
        await emit(`You're on a break (${timer.remainingMinutes} min left). Step away from the screen for a minute and hydrate.`)
        return fullResponse
      }
      await emit(`The focus timer is idle right now. Head to the **Focus** tab whenever you want to start a 25-minute round.`)
      return fullResponse
    }
  }

  // 6. E-JUST Knowledge Base Queries
  if (
    query.includes('credit') ||
    query.includes('pass') ||
    query.includes('grade') ||
    query.includes('grading') ||
    query.includes('regulation') ||
    query.includes('e-just') ||
    query.includes('ejust')
  ) {
    const res = await executeTool('query_knowledge', { query }, ctx)
    if (res.success && res.data) {
      const docs = (res.data as { documents: { title: string; content: string }[] }).documents
      const formatted = docs.slice(0, 2).map(d => `### ${d.title}\n${d.content}`).join('\n\n')
      await emit(formatted)
      return fullResponse
    }
  }

  // 7. Academic Explanations & Concepts
  if (query.includes('binary search')) {
    await emit(
      `**Binary Search** is an $O(\\log n)$ search algorithm for **sorted** arrays.\n\n` +
      `### How it works\n` +
      `1. Check the middle index: \`mid = (low + high) // 2\`.\n` +
      `2. If \`arr[mid] == target\`, return \`mid\`.\n` +
      `3. If \`arr[mid] < target\`, search the right half (\`low = mid + 1\`).\n` +
      `4. Otherwise search the left half (\`high = mid - 1\`).\n\n` +
      `\`\`\`python\ndef binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        if arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\`\`\`\n` +
      `Want to walk through a quick trace?`
    )
    return fullResponse
  }

  if (query.includes('big o') || query.includes('complexity') || query.includes('time complexity')) {
    await emit(
      `**Big-O Notation** describes how an algorithm's runtime or memory grows as input size $n$ grows:\n\n` +
      `• **O(1)** — Constant (array index lookup, hash table average)\n` +
      `• **O(log n)** — Logarithmic (binary search)\n` +
      `• **O(n)** — Linear (single loop)\n` +
      `• **O(n log n)** — Linearithmic (merge sort, quicksort average)\n` +
      `• **O(n²)** — Quadratic (nested loops, bubble sort)`
    )
    return fullResponse
  }

  if (query.includes('derivative')) {
    await emit(
      `A **derivative** measures instantaneous rate of change (slope of the tangent line at $x$):\n\n` +
      `$$\\frac{df}{dx} = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$\n\n` +
      `### Core rules\n` +
      `• **Power Rule:** $(x^n)' = n x^{n-1}$\n` +
      `• **Product Rule:** $(uv)' = u'v + uv'$\n` +
      `• **Chain Rule:** $(f(g(x)))' = f'(g(x)) \\cdot g'(x)$`
    )
    return fullResponse
  }

  if (query.includes('integral')) {
    await emit(
      `An **integral** accumulates a quantity continuously.\n\n` +
      `• **Definite integral** $\\int_a^b f(x)\\,dx$ gives the signed area under $f(x)$ from $a$ to $b$.\n` +
      `• **Antiderivative:** if $F'(x) = f(x)$, then $\\int f(x)\\,dx = F(x) + C$.\n\n` +
      `Example: $\\int x^2\\,dx = \\frac{x^3}{3} + C$.`
    )
    return fullResponse
  }

  if (query.includes('recursion')) {
    await emit(
      `**Recursion** is when a function solves a problem by calling itself on a smaller subproblem.\n\n` +
      `Every recursive function needs:\n` +
      `1. A **base case** that stops the recursion.\n` +
      `2. A **recursive step** that moves closer to the base case.\n\n` +
      `\`\`\`python\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\`\`\``
    )
    return fullResponse
  }

  // 8. Arabic Greeting or Query
  if (/[\u0600-\u06FF]/.test(query)) {
    await emit(
      `أهلاً يا ${name}! أنا أوتومو-تشان. في الوضع السريع بدون إنترنت يمكنني مساعدتك في جدولك الدراسي، المهام (أو إضافة مهمة جديدة)، مواعيد الامتحانات، مؤقت التركيز، وبعض الشروحات السريعة.\n\n` +
      `جرّب مثلاً: *"What classes do I have today?"* أو *"Show my tasks"* أو حمّل النموذج المحلي من **Model Settings** للدردشة الحرة بالكامل.`
    )
    return fullResponse
  }

  // 9. Greetings & Personality-rich Casual Inquiries
  if (/^(hi|hello|hey|yo|sup)\b/.test(query) || query.includes('konnichiwa') || query.includes('ohayo') || query.includes('konbanwa')) {
    await emit(`Konnichiwa, ${name}. What are we tackling today — classes, tasks, exams, or a concept that's refusing to make sense?`)
    return fullResponse
  }

  if (query.includes('who are you') || query.includes('your name')) {
    await emit(`I'm **Otomo-chan** (お供ちゃん) — your study companion inside Otomo. Quietly keeping track of your classes, Building 18 exam rooms, tasks, and focus sessions.`)
    return fullResponse
  }

  // 10. Honest boundary for open-ended questions without a loaded WebGPU model
  await emit(
    `I'm currently in **Quick Offline Mode**, ${name}. I can check your live schedule, Building 18 exams, tasks (and add new ones), focus timer, and core CS/math topics — ` +
    `but open-ended questions need a downloaded local model.\n\n` +
    `Try:\n` +
    `• *"What classes do I have today?"*\n` +
    `• *"What are my midterm exams?"*\n` +
    `• *"Add task Finish lab report"*\n` +
    `• *"Explain Big-O complexity"*\n\n` +
    `Or open **Model Settings** in the top bar to load the local CPU model (works without WebGPU), connect an API, or load a compatible WebGPU model for full free-form chat.`
  )
  return fullResponse
}
