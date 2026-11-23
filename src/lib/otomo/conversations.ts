/**
 * Otomo-chan Conversation Storage
 *
 * Manages conversation history in IndexedDB.
 * Conversations are independent from long-term memories.
 * Supports search, rename, delete, export, and optional cloud sync.
 */

import { run as idbRun } from '@/lib/db'
import type { Conversation, ChatMessage } from '@/lib/types'

const uid = () => crypto.randomUUID()

// ─── Conversation CRUD ─────────────────────────────────────────────────────

export async function createConversation(owner: string, title?: string): Promise<Conversation> {
  const conv: Conversation = {
    id: uid(),
    title: title || `Chat ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    owner,
    pinned: false
  }

  await idbRun(['conversations'], 'readwrite', t =>
    t.objectStore('conversations').add(conv)
  )

  return conv
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return idbRun<Conversation | undefined>(['conversations'], 'readonly', t =>
    t.objectStore('conversations').get(id)
  )
}

export async function listConversations(owner?: string): Promise<Conversation[]> {
  const all = await idbRun<Conversation[]>(['conversations'], 'readonly', t =>
    t.objectStore('conversations').getAll()
  )
  const filtered = owner ? all.filter(c => c.owner === owner) : all
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const conv = await getConversation(id)
  if (!conv) return
  await idbRun(['conversations'], 'readwrite', t =>
    t.objectStore('conversations').put({ ...conv, title, updatedAt: Date.now() })
  )
}

export async function togglePinConversation(id: string): Promise<void> {
  const conv = await getConversation(id)
  if (!conv) return
  await idbRun(['conversations'], 'readwrite', t =>
    t.objectStore('conversations').put({ ...conv, pinned: !conv.pinned, updatedAt: Date.now() })
  )
}

export async function deleteConversation(id: string): Promise<void> {
  // Delete all messages first
  const messages = await listMessages(id)
  await idbRun(['messages', 'conversations'], 'readwrite', t => {
    const msgStore = t.objectStore('messages')
    for (const msg of messages) msgStore.delete(msg.id)
    t.objectStore('conversations').delete(id)
  })
}

export async function deleteAllConversations(owner: string): Promise<void> {
  const convs = await listConversations(owner)
  for (const c of convs) {
    await deleteConversation(c.id)
  }
}

// ─── Message CRUD ──────────────────────────────────────────────────────────

export async function addMessage(
  conversationId: string,
  role: ChatMessage['role'],
  content: string,
  expression?: ChatMessage['expression']
): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: uid(),
    conversationId,
    role,
    content,
    expression,
    createdAt: Date.now()
  }

  await idbRun(['messages', 'conversations'], 'readwrite', t => {
    t.objectStore('messages').add(msg)
    // Update conversation's updatedAt timestamp
    const convStore = t.objectStore('conversations')
    const req = convStore.get(conversationId)
    req.onsuccess = () => {
      const conv = req.result as Conversation | undefined
      if (conv) convStore.put({ ...conv, updatedAt: Date.now() })
    }
  })

  return msg
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const all = await idbRun<ChatMessage[]>(['messages'], 'readonly', t =>
    t.objectStore('messages').index('conversationId').getAll(conversationId)
  )
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const msg = await idbRun<ChatMessage | undefined>(['messages'], 'readonly', t =>
    t.objectStore('messages').get(id)
  )
  if (!msg) return
  await idbRun(['messages'], 'readwrite', t =>
    t.objectStore('messages').put({ ...msg, content })
  )
}

// ─── Search ────────────────────────────────────────────────────────────────

export async function searchConversations(
  owner: string,
  query: string
): Promise<{ conversation: Conversation; matchingMessages: ChatMessage[] }[]> {
  const lower = query.toLowerCase()
  const convs = await listConversations(owner)
  const results: { conversation: Conversation; matchingMessages: ChatMessage[] }[] = []

  for (const conv of convs) {
    // Check title match
    const titleMatch = conv.title.toLowerCase().includes(lower)

    // Check message content match
    const messages = await listMessages(conv.id)
    const matchingMessages = messages.filter(m =>
      m.content.toLowerCase().includes(lower)
    )

    if (titleMatch || matchingMessages.length > 0) {
      results.push({ conversation: conv, matchingMessages: matchingMessages.slice(0, 3) })
    }
  }

  return results
}

// ─── Export ─────────────────────────────────────────────────────────────────

export async function exportConversation(id: string): Promise<{
  conversation: Conversation
  messages: ChatMessage[]
} | null> {
  const conv = await getConversation(id)
  if (!conv) return null
  const messages = await listMessages(id)
  return { conversation: conv, messages }
}

export async function exportAllConversations(owner: string): Promise<{
  conversation: Conversation
  messages: ChatMessage[]
}[]> {
  const convs = await listConversations(owner)
  const results = []
  for (const conv of convs) {
    const messages = await listMessages(conv.id)
    results.push({ conversation: conv, messages })
  }
  return results
}

// ─── Auto-title generation helper ──────────────────────────────────────────
/**
 * Generates a short title from the first user message.
 * Used as a fallback when the AI doesn't suggest a title.
 */
export function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\n/g, ' ').trim()
  if (cleaned.length <= 40) return cleaned
  return cleaned.slice(0, 37) + '...'
}

// ─── Conversation Statistics ───────────────────────────────────────────────

export async function getConversationStats(owner: string): Promise<{
  totalConversations: number
  totalMessages: number
  oldestConversation: number | null
}> {
  const convs = await listConversations(owner)
  let totalMessages = 0
  for (const conv of convs) {
    const msgs = await listMessages(conv.id)
    totalMessages += msgs.length
  }
  return {
    totalConversations: convs.length,
    totalMessages,
    oldestConversation: convs.length > 0 ? Math.min(...convs.map(c => c.createdAt)) : null
  }
}
