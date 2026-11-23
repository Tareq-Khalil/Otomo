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

// ─── Otomo-chan Character & Expressions ──────────────────────────────────────
export type CharacterExpression =
  | 'idle'
  | 'thinking'
  | 'listening'
  | 'happy'
  | 'confused'
  | 'explaining'
  | 'studying'
  | 'resting'
  | 'cheering'
  | 'moody'
  | 'welcome'

// ─── Conversations & Chat ───────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  expression?: CharacterExpression
  createdAt: number
  toolCalls?: { name: string; args: Record<string, unknown>; result?: unknown }[]
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  owner: string
  pinned?: boolean
}

// ─── Student Long-term Memory ───────────────────────────────────────────────
export type MemoryCategory = 'preference' | 'academic' | 'project' | 'goal' | 'fact'

export interface StudentMemory {
  id: string
  owner: string
  category: MemoryCategory
  content: string
  importance: number // 1 to 5
  isActive: boolean
  createdAt: number
  updatedAt: number
}

// ─── Otomo-chan Studio Configurations ───────────────────────────────────────
export interface IdentityConfig {
  name: string
  title: string
  description: string
  defaultLanguage: 'en' | 'ar' | 'ja'
}

export interface PersonalityConfig {
  friendliness: number // 0-100
  playfulness: number // 0-100
  humor: number // 0-100
  formality: number // 0-100
  enthusiasm: number // 0-100
  responseLength: 'concise' | 'balanced' | 'detailed'
  explanationDepth: 'simple' | 'balanced' | 'deep'
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'expressive'
  customInstructions: string
}

export interface BrainConfig {
  defaultModel: string
  fallbackModel: string
  temperature: number
  top_p: number
  maxTokens: number
  systemPromptTemplate: string
}

export type DeliveryStyleKey = 'casual' | 'academic' | 'focus' | 'discovery' | 'serious' | 'lighthearted'

export interface DeliveryStyle {
  rate: number
  pitch: number
  volume?: number
}

export interface VoiceConfig {
  voiceIdentity: string
  engine: 'webspeech' | 'neural_wasm' | 'custom'
  selectedVoiceName?: string
  defaultPitch: number
  defaultRate: number
  defaultVolume: number
  expressiveness: number
  deliveryStyles: Record<DeliveryStyleKey, DeliveryStyle>
}

export interface MemoryRulesConfig {
  extractionEnabled: boolean
  categories: MemoryCategory[]
  maxStoredMemories: number
  retentionPolicy: 'consolidate' | 'keep_recent' | 'keep_all'
}

export interface ToolsConfig {
  enabledTools: string[]
}

export interface OtomoConfiguration {
  version: number
  status: 'draft' | 'published' | 'archived'
  identity: IdentityConfig
  personality: PersonalityConfig
  brain: BrainConfig
  voice: VoiceConfig
  memory_rules: MemoryRulesConfig
  tools: ToolsConfig
  changelog: string
  published_at?: string | null
  created_at?: string
}

// ─── University Knowledge Base ──────────────────────────────────────────────
export interface KnowledgeDocument {
  id: string
  title: string
  faculty: string
  level?: number | null
  course_code?: string | null
  category: 'general' | 'faculty' | 'course' | 'exam' | 'regulation' | 'campus'
  content: string
  tags: string[]
  created_at?: string
  updated_at?: string
}

// ─── Feedback & Complaints ──────────────────────────────────────────────────
export type FeedbackType = 'suggestion' | 'complaint' | 'bug' | 'other'
export type FeedbackStatus = 'new' | 'under_review' | 'in_progress' | 'responded' | 'resolved' | 'rejected'

export interface FeedbackSubmission {
  id: string
  user_id?: string | null
  user_email?: string | null
  user_name?: string | null
  type: FeedbackType
  subject: string
  description: string
  attachment_url?: string | null
  contact_pref?: string
  status: FeedbackStatus
  admin_response?: string | null
  responded_at?: string | null
  created_at: string
  updated_at: string
}

// ─── User Role & Permissions ───────────────────────────────────────────────
export type UserRole = 'student' | 'admin'
