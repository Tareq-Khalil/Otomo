import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  Brain,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  listMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  deleteAllMemories,
  toggleMemory
} from '@/lib/otomo/memory'
import type { StudentMemory, MemoryCategory } from '@/lib/types'

interface MemoryManagerModalProps {
  open: boolean
  owner: string
  onClose: () => void
}

export function MemoryManagerModal({ open, owner, onClose }: MemoryManagerModalProps) {
  const [memories, setMemories] = useState<StudentMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MemoryCategory | 'all'>('all')

  // New memory input
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference')
  const [isAdding, setIsAdding] = useState(false)

  // Edit memory state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (open) {
      void load()
    }
  }, [open, owner])

  const load = async () => {
    setLoading(true)
    try {
      const items = await listMemories(owner)
      setMemories(items)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string) => {
    await toggleMemory(id)
    await load()
  }

  const handleDelete = async (id: string) => {
    await deleteMemory(id)
    await load()
  }

  const handleDeleteAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    await deleteAllMemories(owner)
    setConfirmClear(false)
    await load()
  }

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return
    await updateMemory(id, { content: editContent.trim() })
    setEditingId(null)
    await load()
  }

  const handleCreate = async () => {
    if (!newContent.trim()) return
    await createMemory(owner, newCategory, newContent.trim(), 4)
    setNewContent('')
    setIsAdding(false)
    await load()
  }

  if (!open) return null

  const filtered = filter === 'all'
    ? memories
    : memories.filter(m => m.category === filter)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] overflow-hidden rounded-3xl border border-line bg-surface text-ink shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 border border-accent/20 text-accent">
              <Brain size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight">Otomo-chan's Memory</h2>
              <p className="label !text-[9px]">What she has learned about your study preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-mute hover:bg-bg hover:text-ink transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Privacy Note */}
        <div className="bg-bg/60 border-b border-line px-6 py-2.5 flex items-center gap-2 text-[11px] text-mute">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Stored on your device in IndexedDB. Never shared with third parties or ads.</span>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-6 py-2 text-xs">
          {(['all', 'preference', 'academic', 'goal', 'project', 'fact'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${filter === cat ? 'bg-accent text-white font-semibold' : 'bg-bg text-mute hover:text-ink'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <p className="text-center py-8 text-xs font-mono text-mute">Loading memories...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-mute space-y-2">
              <Brain size={24} className="mx-auto opacity-40" />
              <p className="text-xs">No memories found in this category.</p>
              <p className="text-[11px] text-mute">Otomo-chan automatically learns your preferences during conversation, or you can add one manually.</p>
            </div>
          ) : (
            filtered.map(mem => (
              <div
                key={mem.id}
                className={`group rounded-2xl border p-3.5 transition-colors ${mem.isActive ? 'border-line bg-surface' : 'border-line/60 bg-bg/40 opacity-60'}`}
              >
                {editingId === mem.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-line bg-bg p-2 text-xs focus:border-accent focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" variant="accent" onClick={() => handleSaveEdit(mem.id)}><Check size={12} /> Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="label !text-accent font-semibold">{mem.category}</span>
                        <span className="text-[10px] text-mute">
                          Priority {mem.importance}/5 · {new Date(mem.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-ink leading-relaxed">{mem.content}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleToggle(mem.id)}
                        title={mem.isActive ? 'Disable memory' : 'Enable memory'}
                        className="rounded-lg p-1.5 text-mute hover:bg-bg hover:text-ink"
                      >
                        {mem.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => { setEditingId(mem.id); setEditContent(mem.content) }}
                        title="Edit memory"
                        className="rounded-lg p-1.5 text-mute hover:bg-bg hover:text-ink"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(mem.id)}
                        title="Delete memory"
                        className="rounded-lg p-1.5 text-mute hover:bg-bg hover:text-accent"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Manual Add Memory Section */}
          {isAdding ? (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">Add Custom Memory</h4>
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as MemoryCategory)}
                  className="h-9 rounded-xl border border-line bg-surface px-2 text-xs font-mono"
                >
                  <option value="preference">Preference</option>
                  <option value="academic">Academic</option>
                  <option value="goal">Goal</option>
                  <option value="project">Project</option>
                  <option value="fact">Fact</option>
                </select>
                <input
                  type="text"
                  placeholder="e.g. Prefers concise calculus explanations with examples"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="h-9 flex-1 rounded-xl border border-line bg-surface px-3 text-xs focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button size="sm" variant="accent" onClick={handleCreate}><Plus size={12} /> Add Memory</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full rounded-2xl border border-dashed border-line p-3 text-xs font-mono text-mute hover:border-accent hover:text-ink flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Add new memory trait
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-3.5 bg-bg/50">
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="accent" onClick={handleDeleteAll}>Confirm clear</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteAll}
              className="!text-accent hover:bg-accent/10"
              disabled={memories.length === 0}
            >
              Clear All Memories
            </Button>
          )}
          <Button size="sm" variant="line" onClick={onClose}>
            Done
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
