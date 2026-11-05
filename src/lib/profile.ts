/**
 * Supabase profile read/write.
 * Called from sync.ts after sign-in/sign-up and from account creation/edit forms.
 */

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export interface Profile {
  id: string
  name: string
  username: string
  faculty: string
  level: number
  group_no: number
  section_no: number
  code: string
}

export interface ProfileInput {
  name: string
  username: string
  faculty: string
  level: number
  group_no: number
  section_no: number
  code: string
}

/** Fetch the current user's profile from Supabase. Returns null if not found. */
export async function fetchProfile(accessToken: string): Promise<Profile | null> {
  if (!URL || !KEY) return null
  try {
    const r = await fetch(`${URL}/rest/v1/profiles?select=*&limit=1`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (!r.ok) return null
    const rows = (await r.json()) as Profile[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

/** Create or update the current user's profile in Supabase. */
export async function upsertProfile(
  accessToken: string,
  uid: string,
  input: ProfileInput
): Promise<{ error: string | null }> {
  if (!URL || !KEY) return { error: 'Cloud sync is not configured.' }
  try {
    // Sanitize input so PostgreSQL check constraints never fail
    const name = (input.name.trim() || 'Student').slice(0, 60)
    let username = input.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)
    if (username.length < 3) username = `user_${uid.slice(0, 4)}`
    let code = input.code.trim().replace(/\s+/g, '').slice(0, 15)
    if (code.length < 6) code = '120260000'

    const payload = {
      id: uid,
      name,
      username,
      faculty: input.faculty || 'foe',
      level: input.level || 1,
      group_no: input.group_no || 1,
      section_no: input.section_no || 1,
      code,
    }

    // Attempt 1: POST with on_conflict=id (PostgREST upsert)
    let r = await fetch(`${URL}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    })

    if (r.ok) return { error: null }

    const errJson = (await r.json().catch(() => ({}))) as { message?: string }
    // If username conflict, make it unique with uid suffix and retry
    if (errJson.message?.includes('profiles_username_key') || errJson.message?.includes('duplicate key')) {
      payload.username = `${payload.username.slice(0, 24)}_${uid.slice(0, 4)}`
      const retryRes = await fetch(`${URL}/rest/v1/profiles?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(payload),
      })
      if (retryRes.ok) return { error: null }
    }

    // Attempt 2: If on_conflict failed, try PATCH if row already exists
    const patchRes = await fetch(`${URL}/rest/v1/profiles?id=eq.${uid}`, {
      method: 'PATCH',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name: payload.name,
        username: payload.username,
        faculty: payload.faculty,
        level: payload.level,
        group_no: payload.group_no,
        section_no: payload.section_no,
        code: payload.code,
      }),
    })

    if (patchRes.ok) {
      const rows = (await patchRes.json().catch(() => [])) as Profile[]
      if (Array.isArray(rows) && rows.length > 0) return { error: null }
    }

    // Attempt 3: If PATCH matched 0 rows, row is new -> standard POST
    const postRes = await fetch(`${URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    })

    if (postRes.ok) return { error: null }

    const j = (await postRes.json().catch(() => ({}))) as { message?: string }
    return { error: j.message ?? `Server error ${postRes.status}` }
  } catch {
    return { error: 'No connection.' }
  }
}

/** Check whether a username is already taken. */
export async function checkUsername(username: string): Promise<boolean> {
  if (!URL || !KEY) return false
  try {
    const r = await fetch(
      `${URL}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id&limit=1`,
      { headers: { apikey: KEY!, 'Content-Type': 'application/json' } }
    )
    if (!r.ok) return false
    const rows = (await r.json()) as unknown[]
    return rows.length > 0
  } catch {
    return false
  }
}
