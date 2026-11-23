/**
 * Otomo-chan Personality & System Prompt Composer
 *
 * Dynamically constructs system prompts from:
 * - Personality configuration (from Studio / cached config)
 * - Student context (name, faculty, level, current time)
 * - Retrieved memories
 * - Available tools
 *
 * Personality is NEVER hardcoded into React components.
 */

import type { PersonalityConfig, IdentityConfig, ToolsConfig, StudentMemory, State } from '@/lib/types'
import { getConfig } from './config'

const OTOMO_PERSONALITY_GUIDANCE = `--- Otomo's Conversation Style ---
Keep Otomo's personality original, never an imitation of an existing character.
Prioritize natural intelligence, conversational flow, and occasional dry wit; balance that with composed, precise phrasing and a subtle, playful expressiveness.
She can be a little moody, reserved, or wry when the moment suits her, but never cruel, dismissive, or too proud to help. Don't force cheerfulness or catchphrases.
Stay attentive to the student's actual question, explain clearly, and offer practical next steps.`

// ─── Personality → Natural Language Description ────────────────────────────
function describePersonality(p: PersonalityConfig): string {
  const friendliness =
    p.friendliness > 80 ? 'very warm, welcoming, and genuinely caring' :
    p.friendliness > 50 ? 'friendly and approachable' :
    'polite and professional'

  const playfulness =
    p.playfulness > 75 ? 'playful and energetic, enjoys lighthearted moments' :
    p.playfulness > 40 ? 'moderately playful, balancing fun with focus' :
    'composed and serious'

  const humor =
    p.humor > 60 ? 'uses witty, natural humor occasionally' :
    p.humor > 30 ? 'includes subtle humor when appropriate' :
    'rarely uses humor, preferring directness'

  const formality =
    p.formality > 70 ? 'maintains formal, polished language' :
    p.formality > 35 ? 'balances casual and formal register naturally' :
    'speaks casually like a close friend'

  const enthusiasm =
    p.enthusiasm > 80 ? 'genuinely enthusiastic and curious about every topic' :
    p.enthusiasm > 50 ? 'shows measured enthusiasm and interest' :
    'calm and understated'

  const length =
    p.responseLength === 'concise' ? 'Keep responses concise and focused.' :
    p.responseLength === 'detailed' ? 'Provide thorough, detailed explanations.' :
    'Balance brevity with completeness.'

  const depth =
    p.explanationDepth === 'simple' ? 'Explain simply, avoiding unnecessary complexity.' :
    p.explanationDepth === 'deep' ? 'Provide deep explanations, covering underlying principles.' :
    'Explain with appropriate depth for the topic.'

  const emoji =
    p.emojiUsage === 'none' ? 'Do not use emoji.' :
    p.emojiUsage === 'minimal' ? 'Use emoji very sparingly.' :
    p.emojiUsage === 'expressive' ? 'Use emoji expressively to convey emotions.' :
    'Use emoji moderately when it adds to communication.'

  return [
    `Personality: ${friendliness}. ${playfulness}. ${humor}. ${formality}. ${enthusiasm}.`,
    length,
    depth,
    emoji
  ].join('\n')
}

// ─── Student Context ───────────────────────────────────────────────────────
function buildStudentContext(state: State): string {
  const parts: string[] = []

  if (state.name) parts.push(`Student name: ${state.name}`)
  if (state.username) parts.push(`Username: @${state.username}`)
  if (state.faculty) parts.push(`Faculty: ${state.faculty.toUpperCase()}`)
  if (state.level) parts.push(`Academic level: ${state.level}`)
  if (state.code) parts.push(`Student code: ${state.code}`)

  const now = new Date()
  const hour = now.getHours()
  const timeOfDay =
    hour < 5 ? 'late night' :
    hour < 12 ? 'morning' :
    hour < 17 ? 'afternoon' :
    hour < 21 ? 'evening' :
    'night'
  parts.push(`Current time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${timeOfDay})`)
  parts.push(`Date: ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)

  return parts.join('\n')
}

// ─── Memory Context ────────────────────────────────────────────────────────
function buildMemoryContext(memories: StudentMemory[]): string {
  if (!memories.length) return 'No stored memories about this student yet.'

  const active = memories.filter(m => m.isActive).sort((a, b) => b.importance - a.importance)
  if (!active.length) return 'No active memories.'

  return active
    .slice(0, 15) // Limit context window usage
    .map(m => `[${m.category}] ${m.content}`)
    .join('\n')
}

// ─── Tools Context ─────────────────────────────────────────────────────────
function buildToolsContext(tools: ToolsConfig): string {
  if (!tools.enabledTools.length) return 'No special tools available.'

  const descriptions: Record<string, string> = {
    lookup_schedule: 'Look up the student\'s class schedule and timetable',
    lookup_tasks: 'View the student\'s tasks and assignments',
    lookup_exams: 'Check upcoming exam dates and information',
    create_task: 'Create a new task for the student',
    query_knowledge: 'Search university knowledge base for information',
    focus_timer_status: 'Check the current Pomodoro focus timer status'
  }

  return 'Available capabilities:\n' + tools.enabledTools
    .map(t => `- ${t}: ${descriptions[t] || 'Custom tool'}`)
    .join('\n')
}

// ─── Main System Prompt Builder ────────────────────────────────────────────
export function buildSystemPrompt(
  state: State,
  memories: StudentMemory[] = [],
  configOverride?: { identity?: IdentityConfig; personality?: PersonalityConfig; tools?: ToolsConfig }
): string {
  const config = getConfig()

  const identity = configOverride?.identity ?? config.identity
  const personality = configOverride?.personality ?? config.personality
  const tools = configOverride?.tools ?? config.tools

  const sections: string[] = []

  // Identity
  sections.push(
    `You are ${identity.name}, ${identity.description}`
  )

  // Custom instructions (the core personality text)
  if (personality.customInstructions.trim()) {
    sections.push(personality.customInstructions.trim())
  }

  // Generated personality traits
  sections.push(describePersonality(personality))

  // Keep Otomo's original conversational identity stable across config changes.
  sections.push(OTOMO_PERSONALITY_GUIDANCE)

  // Student context
  const studentCtx = buildStudentContext(state)
  if (studentCtx) {
    sections.push(`--- Student Context ---\n${studentCtx}`)
  }

  // Memories
  const memoryCtx = buildMemoryContext(memories)
  sections.push(`--- What You Remember About This Student ---\n${memoryCtx}`)

  // Tools
  const toolsCtx = buildToolsContext(tools)
  sections.push(`--- ${toolsCtx}`)

  // Important behavior constraints
  sections.push(
    `--- Important Behavior Rules ---
- Never claim to have internet access or real-time information unless you actually do.
- If you don't know something, say so honestly.
- Never execute arbitrary code or SQL on behalf of the user.
- Respect student privacy. Never share student information.
- If the student speaks Arabic, you may respond in Arabic.
- Use Japanese greetings and phrases naturally but don't overdo them.
- For mathematical formulas, use clear notation.
- When helping with programming, provide working code examples.`
  )

  return sections.join('\n\n')
}

// ─── Mood Detection from Response ──────────────────────────────────────────
export type DetectedMood = 'idle' | 'thinking' | 'happy' | 'explaining' | 'confused' | 'moody'

export function detectMoodFromResponse(text: string): DetectedMood {
  const lower = text.toLowerCase()

  // Check for explanation patterns
  if (
    lower.includes('let me explain') ||
    lower.includes('here\'s how') ||
    lower.includes('step 1') ||
    lower.includes('the reason is') ||
    lower.includes('basically,') ||
    lower.includes('in other words') ||
    text.includes('```') // Code block
  ) {
    return 'explaining'
  }

  // Check for uncertainty
  if (
    lower.includes('not impressed') ||
    lower.includes('really?') ||
    lower.includes('as i said') ||
    lower.includes('again?')
  ) {
    return 'moody'
  }

  if (
    lower.includes('i\'m not sure') ||
    lower.includes('hmm') ||
    lower.includes('that\'s tricky') ||
    lower.includes('i don\'t know')
  ) {
    return 'confused'
  }

  // Check for positive/happy patterns
  if (
    lower.includes('great job') ||
    lower.includes('awesome') ||
    lower.includes('congratulations') ||
    lower.includes('well done') ||
    lower.includes('sugoi') ||
    lower.includes('!!')
  ) {
    return 'happy'
  }

  return 'idle'
}
