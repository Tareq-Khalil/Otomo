/**
 * Otomo Feedback Service
 *
 * Handles student suggestions, complaints, and bug reports.
 * Integrates with Supabase for persistent storage and admin management.
 */

import type { FeedbackSubmission, FeedbackType, FeedbackStatus } from '@/lib/types'

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// ─── REST Helper ───────────────────────────────────────────────────────────

async function rest(
  path: string,
  init: { method: string; body?: unknown; prefer?: string },
  token?: string
) {
  if (!URL || !KEY) throw new Error('Supabase not configured')

  const headers: Record<string, string> = {
    apikey: KEY,
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (init.prefer) headers['Prefer'] = init.prefer

  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined
  })

  if (!r.ok) {
    const err = await r.json().catch(() => ({ message: `HTTP ${r.status}` }))
    throw new Error((err as { message?: string }).message || `Request failed: ${r.status}`)
  }

  return r
}

// ─── Student API ───────────────────────────────────────────────────────────

export async function submitFeedback(
  token: string,
  data: {
    type: FeedbackType
    subject: string
    description: string
    user_email?: string
    user_name?: string
    attachment_url?: string
    contact_pref?: string
  }
): Promise<FeedbackSubmission> {
  const r = await rest(
    'feedback_submissions',
    {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        ...data,
        status: 'new'
      }
    },
    token
  )

  const rows = (await r.json()) as FeedbackSubmission[]
  if (!rows[0]) throw new Error('Failed to create feedback submission')
  return rows[0]
}

export async function getMyFeedback(token: string): Promise<FeedbackSubmission[]> {
  const r = await rest(
    'feedback_submissions?order=created_at.desc',
    { method: 'GET' },
    token
  )
  return (await r.json()) as FeedbackSubmission[]
}

export async function getFeedbackById(token: string, id: string): Promise<FeedbackSubmission | null> {
  const r = await rest(
    `feedback_submissions?id=eq.${encodeURIComponent(id)}`,
    { method: 'GET' },
    token
  )
  const rows = (await r.json()) as FeedbackSubmission[]
  return rows[0] ?? null
}

// ─── Admin API ─────────────────────────────────────────────────────────────

export async function getAllFeedback(
  token: string,
  filters?: { type?: FeedbackType; status?: FeedbackStatus }
): Promise<FeedbackSubmission[]> {
  let path = 'feedback_submissions?order=created_at.desc'
  if (filters?.type) path += `&type=eq.${encodeURIComponent(filters.type)}`
  if (filters?.status) path += `&status=eq.${encodeURIComponent(filters.status)}`

  const r = await rest(path, { method: 'GET' }, token)
  return (await r.json()) as FeedbackSubmission[]
}

export async function updateFeedbackStatus(
  token: string,
  id: string,
  status: FeedbackStatus,
  adminResponse?: string
): Promise<void> {
  const body: Record<string, unknown> = { status }
  if (adminResponse !== undefined) {
    body.admin_response = adminResponse
    body.responded_at = new Date().toISOString()
  }

  await rest(
    `feedback_submissions?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', body },
    token
  )
}

// ─── Admin Role Check ──────────────────────────────────────────────────────

export async function checkAdminRole(token: string): Promise<boolean> {
  if (!URL || !KEY) return false
  try {
    const r = await rest(
      'user_roles?select=role',
      { method: 'GET' },
      token
    )
    const rows = (await r.json()) as { role: string }[]
    return rows.some(r => r.role === 'admin')
  } catch {
    return false
  }
}

// ─── Attachment Upload ─────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported file type. Allowed: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}.`
  }
  return null
}

export async function uploadAttachment(token: string, file: File): Promise<string> {
  if (!URL || !KEY) throw new Error('Supabase not configured')

  const validation = validateAttachment(file)
  if (validation) throw new Error(validation)

  let owner = 'anonymous'
  try {
    const payload = token.split('.')[1]
    if (payload) {
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      if (typeof json.sub === 'string') owner = json.sub
    }
  } catch { }

  const fileName = `${owner}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const r = await fetch(
    `${URL}/storage/v1/object/feedback_attachments/${fileName}`,
    {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type
      },
      body: file
    }
  )

  if (!r.ok) throw new Error('Failed to upload attachment')

  return `feedback_attachments/${fileName}`
}
