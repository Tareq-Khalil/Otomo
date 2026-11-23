/**
 * Otomo-chan Configuration Loader & Manager
 *
 * Responsible for:
 * - Loading the published configuration from Supabase
 * - Caching configurations locally in IndexedDB
 * - Providing the current active configuration to all subsystems
 * - Supporting draft/preview modes for the Studio
 */

import { run as idbRun } from '@/lib/db'
import type { OtomoConfiguration, IdentityConfig, PersonalityConfig, BrainConfig, VoiceConfig, MemoryRulesConfig, ToolsConfig, KnowledgeDocument } from '@/lib/types'

// ─── Default Configuration (offline fallback) ──────────────────────────────
export const DEFAULT_IDENTITY: IdentityConfig = {
  name: 'Otomo-chan',
  title: 'Anime Student Companion',
  description: 'A friendly, intelligent student companion with a composed, lightly playful personality.',
  defaultLanguage: 'en'
}

export const DEFAULT_PERSONALITY: PersonalityConfig = {
  friendliness: 90,
  playfulness: 70,
  humor: 40,
  formality: 45,
  enthusiasm: 75,
  responseLength: 'balanced',
  explanationDepth: 'deep',
  emojiUsage: 'moderate',
  customInstructions: `You are Otomo-chan, an intelligent companion for E-JUST students.
Lead with natural conversational flow, quick understanding, and occasional dry wit. Keep your wording composed, precise, and quietly elegant, with a small hint of playful expressiveness.
You can be a little moody or reserved, but remain patient, useful, and kind. Never become cruel, dismissive, or artificially cheerful. Use humor sparingly and never force a joke.
Explain difficult concepts patiently and step by step. You can discuss any topic, not just university subjects.
Respond in the language the student uses. Use Japanese greetings only when they feel natural, not as a catchphrase.`
}

export const DEFAULT_BRAIN: BrainConfig = {
  defaultModel: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  fallbackModel: 'offline-knowledge-engine',
  temperature: 0.7,
  top_p: 0.9,
  maxTokens: 1024,
  systemPromptTemplate: '{personality}\n\n--- Student Context ---\n{student_context}\n\n--- Memories ---\n{memories}'
}

export const DEFAULT_VOICE: VoiceConfig = {
  voiceIdentity: 'Otomo-chan Signature Voice',
  engine: 'webspeech',
  defaultPitch: 1.02,
  defaultRate: 1.0,
  defaultVolume: 1.0,
  expressiveness: 75,
  deliveryStyles: {
    casual: { rate: 1.02, pitch: 1.02 },
    academic: { rate: 0.94, pitch: 1.00 },
    focus: { rate: 0.90, pitch: 0.98, volume: 0.85 },
    discovery: { rate: 1.06, pitch: 1.05 },
    serious: { rate: 0.92, pitch: 0.97 },
    lighthearted: { rate: 1.04, pitch: 1.03 }
  }
}

export const DEFAULT_MEMORY_RULES: MemoryRulesConfig = {
  extractionEnabled: true,
  categories: ['preference', 'academic', 'project', 'goal', 'fact'],
  maxStoredMemories: 50,
  retentionPolicy: 'consolidate'
}

export const DEFAULT_TOOLS: ToolsConfig = {
  enabledTools: [
    'lookup_schedule',
    'lookup_tasks',
    'lookup_exams',
    'create_task',
    'query_knowledge',
    'focus_timer_status'
  ]
}

export const DEFAULT_CONFIG: OtomoConfiguration = {
  version: 0,
  status: 'published',
  identity: DEFAULT_IDENTITY,
  personality: DEFAULT_PERSONALITY,
  brain: DEFAULT_BRAIN,
  voice: DEFAULT_VOICE,
  memory_rules: DEFAULT_MEMORY_RULES,
  tools: DEFAULT_TOOLS,
  changelog: 'Default offline configuration'
}

// ─── Cache Key ─────────────────────────────────────────────────────────────
const CACHE_KEY = 'otomo_published_config'

// ─── Active Configuration State ────────────────────────────────────────────
let activeConfig: OtomoConfiguration = { ...DEFAULT_CONFIG }
let previewConfig: OtomoConfiguration | null = null
const listeners = new Set<() => void>()

export function getConfig(): OtomoConfiguration {
  return previewConfig ?? activeConfig
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  listeners.forEach(fn => fn())
}

// ─── Preview Mode (Studio) ─────────────────────────────────────────────────
export function setPreviewConfig(config: OtomoConfiguration | null) {
  previewConfig = config
  notify()
}

export function isPreviewActive(): boolean {
  return previewConfig !== null
}

// ─── Cache Operations ──────────────────────────────────────────────────────
async function getCached(): Promise<OtomoConfiguration | null> {
  try {
    const result = await idbRun<{ key: string; value: OtomoConfiguration } | undefined>(
      ['otomoConfigCache'], 'readonly',
      t => t.objectStore('otomoConfigCache').get(CACHE_KEY)
    )
    return result?.value ?? null
  } catch {
    return null
  }
}

async function setCached(config: OtomoConfiguration): Promise<void> {
  try {
    await idbRun(
      ['otomoConfigCache'], 'readwrite',
      t => t.objectStore('otomoConfigCache').put({ key: CACHE_KEY, value: config })
    )
  } catch {
    // IndexedDB might not be available
  }
}

// ─── Load from Supabase ────────────────────────────────────────────────────
export async function fetchPublishedConfig(): Promise<OtomoConfiguration | null> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return null

  try {
    const r = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/otomo_configurations?status=eq.published&order=version.desc&limit=1`,
      {
        headers: {
          apikey: key,
          'Content-Type': 'application/json'
        }
      }
    )
    if (!r.ok) return null
    const rows = (await r.json()) as OtomoConfiguration[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

// ─── Initialization ────────────────────────────────────────────────────────
let initialization: Promise<OtomoConfiguration> | null = null

export function initConfig(): Promise<OtomoConfiguration> {
  if (!initialization) {
    initialization = (async () => {
      // 1. Try cached version first (instant startup)
      const cached = await getCached()
      if (cached) {
        activeConfig = { ...DEFAULT_CONFIG, ...cached }
        notify()
      }

      // 2. Try fetching the latest published version from Supabase
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const remote = await fetchPublishedConfig()
        if (remote && remote.version > activeConfig.version) {
          activeConfig = remote
          await setCached(remote)
          notify()
        }
      }

      return getConfig()
    })()
  }

  return initialization
}

// ─── Supabase Administration ───────────────────────────────────────────────
async function adminRequest(token: string, path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<Response> {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) throw new Error('Supabase not configured')

  const r = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ message: `HTTP ${r.status}` }))
    throw new Error((err as { message?: string }).message || `Request failed: ${r.status}`)
  }
  return r
}

export async function publishConfiguration(token: string, config: OtomoConfiguration): Promise<OtomoConfiguration> {
  const r = await adminRequest(token, 'otomo_configurations', 'POST', {
    version: config.version,
    status: 'published',
    identity: config.identity,
    personality: config.personality,
    brain: config.brain,
    voice: config.voice,
    memory_rules: config.memory_rules,
    tools: config.tools,
    changelog: config.changelog,
    published_at: config.published_at || new Date().toISOString()
  })
  const rows = (await r.json()) as OtomoConfiguration[]
  if (!rows[0]) throw new Error('Failed to publish Otomo configuration')
  return rows[0]
}

export async function listKnowledgeDocuments(token: string): Promise<KnowledgeDocument[]> {
  const r = await adminRequest(token, 'knowledge_documents?order=updated_at.desc', 'GET')
  return (await r.json()) as KnowledgeDocument[]
}

export async function createKnowledgeDocument(token: string, doc: Omit<KnowledgeDocument, 'id'>): Promise<KnowledgeDocument> {
  const r = await adminRequest(token, 'knowledge_documents', 'POST', doc)
  const rows = (await r.json()) as KnowledgeDocument[]
  if (!rows[0]) throw new Error('Failed to add knowledge document')
  return rows[0]
}

// ─── Validation ────────────────────────────────────────────────────────────
export function validateConfig(config: Partial<OtomoConfiguration>): string[] {
  const errors: string[] = []

  if (config.personality) {
    const p = config.personality
    if (p.friendliness < 0 || p.friendliness > 100) errors.push('Friendliness must be 0–100')
    if (p.playfulness < 0 || p.playfulness > 100) errors.push('Playfulness must be 0–100')
    if (p.humor < 0 || p.humor > 100) errors.push('Humor must be 0–100')
    if (p.formality < 0 || p.formality > 100) errors.push('Formality must be 0–100')
    if (p.enthusiasm < 0 || p.enthusiasm > 100) errors.push('Enthusiasm must be 0–100')
  }

  if (config.brain) {
    const b = config.brain
    if (b.temperature < 0 || b.temperature > 2) errors.push('Temperature must be 0–2')
    if (b.top_p < 0 || b.top_p > 1) errors.push('top_p must be 0–1')
    if (b.maxTokens < 64 || b.maxTokens > 4096) errors.push('maxTokens must be 64–4096')
  }

  if (config.voice) {
    const v = config.voice
    if (v.defaultPitch < 0.5 || v.defaultPitch > 2) errors.push('Pitch must be 0.5–2')
    if (v.defaultRate < 0.3 || v.defaultRate > 3) errors.push('Rate must be 0.3–3')
    if (v.defaultVolume < 0 || v.defaultVolume > 1) errors.push('Volume must be 0–1')
  }

  return errors
}
