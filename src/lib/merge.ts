export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type Status = 'todo' | 'doing' | 'done'
export interface Fields {
  title: string; notes: string; priority: Priority; category: string | null; status: Status; completedAt: number | null
  dueDate: string | null; dueTime: string | null; startDate: string | null; startTime: string | null; estMin: number | null; remindMin: number | null; deletedAt: number | null
}
export const FIELDS = ['title', 'notes', 'priority', 'category', 'status', 'dueDate', 'dueTime', 'startDate', 'startTime', 'estMin', 'remindMin', 'deletedAt'] as const
export type FieldKey = (typeof FIELDS)[number]

export const fieldsOf = (t: Fields): Fields => ({
  title: t.title, notes: t.notes, priority: t.priority, category: t.category, status: t.status, completedAt: t.completedAt,
  dueDate: t.dueDate, dueTime: t.dueTime, startDate: t.startDate, startTime: t.startTime, estMin: t.estMin, remindMin: t.remindMin ?? null, deletedAt: t.deletedAt
})


export function threeWay(local: Fields, server: Fields, base: Fields | null): { merged: Fields; conflicts: FieldKey[] } {
  const merged: Fields = { ...local }
  const m = merged as unknown as Record<string, unknown>
  const conflicts: FieldKey[] = []
  for (const k of FIELDS) {
    const L = local[k], S = server[k]
    if (L === S) continue
    if (base && L === base[k]) m[k] = S
    else if (base && S === base[k]) continue
    else conflicts.push(k)
  }
  if (merged.deletedAt && !local.deletedAt && base && FIELDS.some(k => k !== 'deletedAt' && local[k] !== base[k]) && !conflicts.includes('deletedAt')) conflicts.push('deletedAt')
  if (merged.status !== 'done') merged.completedAt = null
  else merged.completedAt = (merged.status === local.status ? local.completedAt : server.completedAt) ?? local.completedAt ?? server.completedAt ?? Date.now()
  return { merged, conflicts }
}
