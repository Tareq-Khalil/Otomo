/**
 * Otomo-chan Long-Term Student Memory Manager
 *
 * Responsible for:
 * - Storing, retrieving, and managing student memories in IndexedDB
 * - Extracting useful information from conversations
 * - Consolidating and deduplicating memories
 * - Providing privacy controls for students
 *
 * Memories are stored SEPARATELY from conversation history.
 * Deleting a conversation does NOT delete extracted memories.
 */

import { run as idbRun } from '@/lib/db'
import type { StudentMemory, MemoryCategory } from '@/lib/types'

const uid = () => crypto.randomUUID()

// ─── CRUD Operations ───────────────────────────────────────────────────────

export async function createMemory(
  owner: string,
  category: MemoryCategory,
  content: string,
  importance: number = 3
): Promise<StudentMemory> {
  const memory: StudentMemory = {
    id: uid(),
    owner,
    category,
    content: content.trim(),
    importance: Math.max(1, Math.min(5, importance)),
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  await idbRun(['memories'], 'readwrite', t =>
    t.objectStore('memories').add(memory)
  )

  return memory
}

export async function getMemory(id: string): Promise<StudentMemory | undefined> {
  return idbRun<StudentMemory | undefined>(['memories'], 'readonly', t =>
    t.objectStore('memories').get(id)
  )
}

export async function listMemories(owner?: string): Promise<StudentMemory[]> {
  const all = await idbRun<StudentMemory[]>(['memories'], 'readonly', t =>
    t.objectStore('memories').getAll()
  )
  if (owner) return all.filter(m => m.owner === owner)
  return all
}

export async function listActiveMemories(owner: string): Promise<StudentMemory[]> {
  const all = await listMemories(owner)
  return all.filter(m => m.isActive).sort((a, b) => b.importance - a.importance)
}

export async function listMemoriesByCategory(owner: string, category: MemoryCategory): Promise<StudentMemory[]> {
  const all = await listMemories(owner)
  return all.filter(m => m.category === category)
}

export async function updateMemory(id: string, updates: Partial<Pick<StudentMemory, 'content' | 'category' | 'importance' | 'isActive'>>): Promise<void> {
  const existing = await getMemory(id)
  if (!existing) throw new Error(`Memory ${id} not found`)

  const updated: StudentMemory = {
    ...existing,
    ...updates,
    updatedAt: Date.now()
  }

  await idbRun(['memories'], 'readwrite', t =>
    t.objectStore('memories').put(updated)
  )
}

export async function deleteMemory(id: string): Promise<void> {
  await idbRun(['memories'], 'readwrite', t =>
    t.objectStore('memories').delete(id)
  )
}

export async function deleteAllMemories(owner: string): Promise<void> {
  const all = await listMemories(owner)
  await idbRun(['memories'], 'readwrite', t => {
    const store = t.objectStore('memories')
    for (const m of all) store.delete(m.id)
  })
}

export async function toggleMemory(id: string): Promise<boolean> {
  const existing = await getMemory(id)
  if (!existing) throw new Error(`Memory ${id} not found`)
  const newActive = !existing.isActive
  await updateMemory(id, { isActive: newActive })
  return newActive
}

// ─── Memory Extraction from AI Responses ───────────────────────────────────
/**
 * Attempts to extract memorable facts from an AI response.
 * This is a heuristic approach — the AI model itself can also
 * suggest memories via tool calls.
 *
 * Returns candidate memories that should be reviewed before storing.
 */
export function extractMemoryCandidates(
  userMessage: string,
  _assistantResponse: string
): { category: MemoryCategory; content: string; importance: number }[] {
  const candidates: { category: MemoryCategory; content: string; importance: number }[] = []
  const lower = userMessage.toLowerCase()

  // Detect learning preferences
  if (
    lower.includes('i prefer') ||
    lower.includes('i like learning') ||
    lower.includes('explain it like') ||
    lower.includes('i learn better')
  ) {
    candidates.push({
      category: 'preference',
      content: `Student expressed a learning preference: "${userMessage.slice(0, 200)}"`,
      importance: 3
    })
  }

  // Detect academic interests
  if (
    lower.includes('my major is') ||
    lower.includes('i\'m studying') ||
    lower.includes('my favorite subject') ||
    lower.includes('i\'m interested in')
  ) {
    candidates.push({
      category: 'academic',
      content: `Academic interest: "${userMessage.slice(0, 200)}"`,
      importance: 4
    })
  }

  // Detect goals
  if (
    lower.includes('my goal is') ||
    lower.includes('i want to') ||
    lower.includes('i\'m working towards') ||
    lower.includes('i plan to')
  ) {
    candidates.push({
      category: 'goal',
      content: `Student goal: "${userMessage.slice(0, 200)}"`,
      importance: 4
    })
  }

  // Detect projects
  if (
    lower.includes('my project') ||
    lower.includes('i\'m building') ||
    lower.includes('i\'m working on')
  ) {
    candidates.push({
      category: 'project',
      content: `Ongoing project: "${userMessage.slice(0, 200)}"`,
      importance: 3
    })
  }

  // Detect explicit "remember this"
  if (
    lower.includes('remember that') ||
    lower.includes('please remember') ||
    lower.includes('don\'t forget')
  ) {
    candidates.push({
      category: 'fact',
      content: userMessage.slice(0, 300),
      importance: 5
    })
  }

  return candidates
}

// ─── Memory Consolidation ──────────────────────────────────────────────────
/**
 * Consolidates memories by removing duplicates and merging similar entries.
 * Should be run periodically, not on every message.
 */
export async function consolidateMemories(owner: string): Promise<{ removed: number }> {
  const all = await listMemories(owner)
  let removed = 0

  // Simple deduplication: remove memories with very similar content
  const seen = new Map<string, StudentMemory>()

  for (const memory of all) {
    const normalized = memory.content.toLowerCase().trim().replace(/\s+/g, ' ')
    const key = normalized.slice(0, 100)

    const existing = seen.get(key)
    if (existing) {
      // Keep the one with higher importance, delete the other
      if (memory.importance > existing.importance) {
        await deleteMemory(existing.id)
        seen.set(key, memory)
      } else {
        await deleteMemory(memory.id)
      }
      removed++
    } else {
      seen.set(key, memory)
    }
  }

  return { removed }
}

// ─── Export/Import for Backup ──────────────────────────────────────────────
export async function exportMemories(owner: string): Promise<StudentMemory[]> {
  return listMemories(owner)
}

export async function importMemories(memories: StudentMemory[]): Promise<number> {
  let count = 0
  await idbRun(['memories'], 'readwrite', t => {
    const store = t.objectStore('memories')
    for (const m of memories) {
      store.put(m)
      count++
    }
  })
  return count
}

// ─── Statistics ────────────────────────────────────────────────────────────
export async function getMemoryStats(owner: string): Promise<{
  total: number
  active: number
  byCategory: Record<MemoryCategory, number>
}> {
  const all = await listMemories(owner)
  const byCategory: Record<MemoryCategory, number> = {
    preference: 0,
    academic: 0,
    project: 0,
    goal: 0,
    fact: 0
  }

  for (const m of all) {
    byCategory[m.category] = (byCategory[m.category] || 0) + 1
  }

  return {
    total: all.length,
    active: all.filter(m => m.isActive).length,
    byCategory
  }
}
