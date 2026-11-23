import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  Sparkles,
  Sliders,
  Cpu,
  BookOpen,
  Brain,
  Wrench,
  History,
  MessageSquare,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Send,
  Eye,
  ArrowLeft,
  Filter,
  Check
} from 'lucide-react'
import { Head } from '@/components/Head'
import { Button } from '@/components/ui/button'
import { OtomoCharacter } from '@/components/OtomoCharacter'
import { useApp } from '@/lib/store'
import { useSync } from '@/lib/sync'
import {
  getConfig,
  DEFAULT_CONFIG,
  setPreviewConfig,
  validateConfig,
  publishConfiguration,
  listKnowledgeDocuments,
  createKnowledgeDocument
} from '@/lib/otomo/config'
import {
  getAllFeedback,
  updateFeedbackStatus,
  checkAdminRole
} from '@/lib/feedback'
import { MODEL_CATALOG, checkDeviceCapability } from '@/lib/otomo/inference'
import type {
  OtomoConfiguration,
  FeedbackSubmission,
  FeedbackStatus,
  FeedbackType,
  KnowledgeDocument
} from '@/lib/types'

interface StudioProps {
  onBack?: () => void
}

function getStudioToken(): string {
  const raw = localStorage.getItem('otomo_session') || localStorage.getItem('uh:meta:session')
  if (!raw) return ''
  try { return JSON.parse(raw).access as string || '' } catch { return '' }
}

type StudioTab =
  | 'identity'
  | 'personality'
  | 'brain'
  | 'knowledge'
  | 'memory'
  | 'tools'
  | 'versions'
  | 'feedback'

export function Studio({ onBack }: StudioProps) {
  const { s } = useApp()
  const sync = useSync()

  const [activeTab, setActiveTab] = useState<StudioTab>('identity')
  const [config, setConfig] = useState<OtomoConfiguration>(() => ({ ...getConfig() }))
  const [savedMessage, setSavedMessage] = useState('')
  const [deviceInfo, setDeviceInfo] = useState<{ webgpu: boolean; estimatedVRAM: string } | null>(null)

  // Admin access state
  const [isAdmin, setIsAdmin] = useState(false)

  // Feedback Management State
  const [feedbacks, setFeedbacks] = useState<FeedbackSubmission[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [selectedFb, setSelectedFb] = useState<FeedbackSubmission | null>(null)
  const [adminReply, setAdminReply] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<FeedbackStatus>('in_progress')
  const [fbFilterStatus, setFbFilterStatus] = useState<string>('all')

  // Knowledge Documents (Local Mock / Supabase)
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([
    {
      id: 'kd-1',
      title: 'E-JUST FOE Academic Regulations (Level 1-4)',
      faculty: 'foe',
      level: 1,
      category: 'regulation',
      content: 'Credit system requires 140 credit hours for graduation. Passing grade for courses is D (50%). Midterm week accounts for 20-30% of total grade.',
      tags: ['regulations', 'grading', 'credits']
    },
    {
      id: 'kd-2',
      title: 'Midterm Examination Schedule Guidelines',
      faculty: 'all',
      category: 'exam',
      content: 'Students must carry their university ID card at all times. Exams in Building 18, 19, and Main Auditorium. Mobile phones are strictly prohibited in examination halls.',
      tags: ['exams', 'midterms', 'rules']
    }
  ])
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocFaculty, setNewDocFaculty] = useState('foe')

  useEffect(() => {
    checkDeviceCapability().then(info => setDeviceInfo(info))

    setIsAdmin(false)
    if (sync.signedIn) {
      const raw = localStorage.getItem('otomo_session') || localStorage.getItem('uh:meta:session')
      if (raw) {
        try {
          const tok = JSON.parse(raw).access
          void checkAdminRole(tok).then(admin => {
            setIsAdmin(admin)
            if (admin) {
              void listKnowledgeDocuments(tok).then(docs => {
                if (docs.length) setKnowledgeDocs(docs)
              }).catch(() => undefined)
            }
          })
        } catch { }
      }
    }
  }, [sync.signedIn])

  // Load feedbacks when feedback tab is active
  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedbacks()
    }
  }, [activeTab])

  const loadFeedbacks = async () => {
    setLoadingFeedback(true)
    try {
      const raw = localStorage.getItem('otomo_session') || localStorage.getItem('uh:meta:session')
      let token = ''
      if (raw) {
        try { token = JSON.parse(raw).access } catch { }
      }

      if (token) {
        const items = await getAllFeedback(token)
        setFeedbacks(items)
      } else {
        // Fallback: check pending local submissions
        const local = JSON.parse(localStorage.getItem('uh:pending_feedback') || '[]')
        setFeedbacks(local)
      }
    } catch {
      const local = JSON.parse(localStorage.getItem('uh:pending_feedback') || '[]')
      setFeedbacks(local)
    } finally {
      setLoadingFeedback(false)
    }
  }

  const handleUpdateFeedback = async () => {
    if (!selectedFb) return
    try {
      const raw = localStorage.getItem('otomo_session') || localStorage.getItem('uh:meta:session')
      let token = ''
      if (raw) {
        try { token = JSON.parse(raw).access } catch { }
      }

      if (token) {
        await updateFeedbackStatus(token, selectedFb.id, updatingStatus, adminReply)
      }

      // Update local state
      setFeedbacks(prev =>
        prev.map(fb =>
          fb.id === selectedFb.id
            ? { ...fb, status: updatingStatus, admin_response: adminReply, responded_at: new Date().toISOString() }
            : fb
        )
      )

      setSelectedFb(prev => prev ? { ...prev, status: updatingStatus, admin_response: adminReply } : null)
      setSavedMessage('Feedback updated and response sent!')
      setTimeout(() => setSavedMessage(''), 3000)
    } catch (err) {
      alert(`Could not update feedback: ${err instanceof Error ? err.message : 'Error'}`)
    }
  }

  const handleSaveDraft = () => {
    const errors = validateConfig(config)
    if (errors.length > 0) {
      alert(`Configuration has issues:\n${errors.join('\n')}`)
      return
    }
    setPreviewConfig(config)
    setSavedMessage('Configuration preview updated! Test it in the chat.')
    setTimeout(() => setSavedMessage(''), 3000)
  }

  const handlePublish = async () => {
    const errors = validateConfig(config)
    if (errors.length > 0) {
      alert(`Cannot publish. Please resolve:\n${errors.join('\n')}`)
      return
    }

    const newVersion = config.version + 1
    const published: OtomoConfiguration = {
      ...config,
      version: newVersion,
      status: 'published',
      published_at: new Date().toISOString()
    }

    setConfig(published)
    setPreviewConfig(null)

    // Save locally and, for admins, publish to Supabase.
    try {
      localStorage.setItem('otomo_published_config', JSON.stringify(published))
    } catch { }

    const token = getStudioToken()
    if (isAdmin && token) {
      try {
        const saved = await publishConfiguration(token, published)
        setConfig(saved)
      } catch (err) {
        setSavedMessage(`Saved locally only: ${err instanceof Error ? err.message : 'Could not publish to Supabase'}`)
        setTimeout(() => setSavedMessage(''), 5000)
        return
      }
    } else if (!isAdmin) {
      setSavedMessage('Draft preview saved locally. Only an administrator can publish.')
      setTimeout(() => setSavedMessage(''), 5000)
      return
    }

    setSavedMessage(`Version ${newVersion} published successfully!`)
    setTimeout(() => setSavedMessage(''), 3500)
  }

  const handleAddKnowledge = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return
    const doc: Omit<KnowledgeDocument, 'id'> = {
      title: newDocTitle.trim(),
      faculty: newDocFaculty,
      category: 'general',
      content: newDocContent.trim(),
      tags: ['custom', newDocFaculty]
    }

    if (isAdmin) {
      const token = getStudioToken()
      if (token) {
        try {
          const saved = await createKnowledgeDocument(token, doc)
          setKnowledgeDocs(prev => [saved, ...prev])
          setSavedMessage('Knowledge document published.')
          setTimeout(() => setSavedMessage(''), 3000)
        } catch (err) {
          setSavedMessage(`Could not publish document: ${err instanceof Error ? err.message : 'Error'}`)
        }
      }
    } else {
      setSavedMessage('Only an administrator can add knowledge documents.')
    }
    setNewDocTitle('')
    setNewDocContent('')
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 text-accent" />
        <h2 className="font-display text-xl font-semibold">Administrator access required</h2>
        <p className="mt-2 text-sm text-mute">Sign in with an administrator account to open the Developer Studio.</p>
        {onBack && <Button className="mt-5" variant="line" onClick={onBack}>Back to Settings</Button>}
      </div>
    )
  }

  const navItems: { id: StudioTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: 'identity', label: 'Identity', icon: Sparkles },
    { id: 'personality', label: 'Personality', icon: Sliders },
    { id: 'brain', label: 'AI Brain', icon: Cpu },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'tools', label: 'Capabilities', icon: Wrench },
    { id: 'versions', label: 'Versions', icon: History },
    { id: 'feedback', label: 'Feedback Desk', icon: MessageSquare }
  ]

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-full p-1 text-mute hover:bg-surface hover:text-ink transition-colors"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <span className="seal !h-7 !w-7 !text-xs">管</span>
            <span className="label !text-accent font-semibold">Authorized Developer Studio</span>
          </div>
          <h1 className="font-display text-3xl font-light italic">Otomo-chan Studio.</h1>
        </div>

        {/* Global Save / Publish Actions */}
        <div className="flex items-center gap-2">
          <Button variant="line" size="sm" onClick={handleSaveDraft}>
            <Eye size={13} /> Preview Draft
          </Button>
          <Button variant="accent" size="sm" onClick={handlePublish}>
            <Save size={13} /> Publish v{config.version + 1}
          </Button>
        </div>
      </div>

      {savedMessage && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-500 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Studio Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-line pb-2">
        {navItems.map(item => {
          const Icon = item.icon
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs uppercase tracking-wider transition-colors shrink-0 ${active ? 'bg-accent text-white font-semibold' : 'bg-surface border border-line text-mute hover:text-ink hover:border-ink/20'}`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* ─── TAB 1: IDENTITY ────────────────────────────────────────────── */}
      {activeTab === 'identity' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-5">
          <h3 className="font-display text-lg font-semibold">Character Identity</h3>
          <p className="text-xs text-mute">Define her name, title, and default persona instructions.</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label block mb-1">Companion Name</label>
              <input
                type="text"
                value={config.identity.name}
                onChange={e => setConfig({ ...config, identity: { ...config.identity, name: e.target.value } })}
                className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="label block mb-1">Companion Title</label>
              <input
                type="text"
                value={config.identity.title}
                onChange={e => setConfig({ ...config, identity: { ...config.identity, title: e.target.value } })}
                className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="label block mb-1">Character Description &amp; Role</label>
            <textarea
              rows={2}
              value={config.identity.description}
              onChange={e => setConfig({ ...config, identity: { ...config.identity, description: e.target.value } })}
              className="w-full rounded-xl border border-line bg-bg p-3 text-xs leading-relaxed focus:border-accent focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="label block mb-1">Default Communication Language</label>
            <select
              value={config.identity.defaultLanguage}
              onChange={e => setConfig({ ...config, identity: { ...config.identity, defaultLanguage: e.target.value as 'en' | 'ar' | 'ja' } })}
              className="h-10 rounded-xl border border-line bg-bg px-3 text-xs font-mono"
            >
              <option value="en">English (Universal)</option>
              <option value="ar">Arabic (العربية)</option>
              <option value="ja">Japanese (日本語)</option>
            </select>
          </div>
        </div>
      )}

      {/* ─── TAB 2: PERSONALITY ─────────────────────────────────────────── */}
      {activeTab === 'personality' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-6">
          <div>
            <h3 className="font-display text-lg font-semibold">Conversational Personality</h3>
            <p className="text-xs text-mute">Adjust sliders to dynamically tune her temperament and dialogue style.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[
              { id: 'friendliness', label: 'Friendliness & Warmth', min: 'Polite', max: 'Very Warm' },
              { id: 'playfulness', label: 'Playfulness & Wit', min: 'Composed', max: 'Cheeky' },
              { id: 'humor', label: 'Humor & Sarcasm', min: 'Subtle', max: 'Noticeable' },
              { id: 'formality', label: 'Formality', min: 'Casual Friend', max: 'Formal Tutor' },
              { id: 'enthusiasm', label: 'Enthusiasm', min: 'Calm', max: 'Curious & Eager' }
            ].map(slider => {
              const val = config.personality[slider.id as keyof typeof config.personality] as number
              return (
                <div key={slider.id} className="rounded-2xl border border-line bg-bg p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-semibold text-ink">{slider.label}</span>
                    <span className="text-accent">{val}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={val}
                    onChange={e => setConfig({
                      ...config,
                      personality: {
                        ...config.personality,
                        [slider.id]: parseInt(e.target.value)
                      }
                    })}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-mute font-mono">
                    <span>{slider.min}</span>
                    <span>{slider.max}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Qualitative Settings */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
            <div>
              <label className="label block mb-1">Response Length</label>
              <select
                value={config.personality.responseLength}
                onChange={e => setConfig({ ...config, personality: { ...config.personality, responseLength: e.target.value as any } })}
                className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs font-mono"
              >
                <option value="concise">Concise &amp; Direct</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Deep &amp; Thorough</option>
              </select>
            </div>

            <div>
              <label className="label block mb-1">Explanation Depth</label>
              <select
                value={config.personality.explanationDepth}
                onChange={e => setConfig({ ...config, personality: { ...config.personality, explanationDepth: e.target.value as any } })}
                className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs font-mono"
              >
                <option value="simple">Intuitive &amp; Simple</option>
                <option value="balanced">Balanced</option>
                <option value="deep">Mathematical &amp; Rigorous</option>
              </select>
            </div>

            <div>
              <label className="label block mb-1">Emoji Usage</label>
              <select
                value={config.personality.emojiUsage}
                onChange={e => setConfig({ ...config, personality: { ...config.personality, emojiUsage: e.target.value as any } })}
                className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs font-mono"
              >
                <option value="none">None</option>
                <option value="minimal">Minimal</option>
                <option value="moderate">Moderate</option>
                <option value="expressive">Expressive</option>
              </select>
            </div>
          </div>

          {/* Custom Personality Prompt */}
          <div>
            <label className="label block mb-1">Custom Character Directives</label>
            <textarea
              rows={4}
              value={config.personality.customInstructions}
              onChange={e => setConfig({ ...config, personality: { ...config.personality, customInstructions: e.target.value } })}
              className="w-full rounded-2xl border border-line bg-bg p-3 text-xs font-mono leading-relaxed focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* ─── TAB 3: AI BRAIN ────────────────────────────────────────────── */}
      {activeTab === 'brain' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Inference Engine &amp; Models</h3>
              <p className="text-xs text-mute">Open-source browser WebGPU models cached locally.</p>
            </div>
            {deviceInfo && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${deviceInfo.webgpu ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                {deviceInfo.webgpu ? 'WebGPU Active' : 'WebGPU Unavailable'}
              </span>
            )}
          </div>

          {/* Model Catalog Selection */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MODEL_CATALOG.map(m => {
              const selected = config.brain.defaultModel === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setConfig({ ...config, brain: { ...config.brain, defaultModel: m.id } })}
                  className={`rounded-2xl border p-4 text-left transition-colors flex flex-col justify-between ${selected ? 'border-accent bg-accent/5' : 'border-line bg-bg hover:border-ink/20'}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-semibold">{m.name}</span>
                      {m.recommended && <span className="label !text-accent">Recommended</span>}
                    </div>
                    <p className="mt-2 text-xs text-mute leading-relaxed">{m.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] font-mono text-mute">
                    <span>Size: {m.size}</span>
                    <span>Min: {m.minRAM}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Hyperparameters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-line pt-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-mute">Temperature:</span>
                <span className="font-semibold">{config.brain.temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={config.brain.temperature}
                onChange={e => setConfig({ ...config, brain: { ...config.brain, temperature: parseFloat(e.target.value) } })}
                className="w-full accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-mute">Top P:</span>
                <span className="font-semibold">{config.brain.top_p}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={config.brain.top_p}
                onChange={e => setConfig({ ...config, brain: { ...config.brain, top_p: parseFloat(e.target.value) } })}
                className="w-full accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-mute">Max Output Tokens:</span>
                <span className="font-semibold">{config.brain.maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="2048"
                step="128"
                value={config.brain.maxTokens}
                onChange={e => setConfig({ ...config, brain: { ...config.brain, maxTokens: parseInt(e.target.value) } })}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: KNOWLEDGE ───────────────────────────────────────────── */}
      {activeTab === 'knowledge' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">University Knowledge Base</h3>
              <p className="text-xs text-mute">Curated academic documents, course syllabi, and guidelines for Otomo-chan.</p>
            </div>
            <span className="label !text-accent">{knowledgeDocs.length} Documents</span>
          </div>

          {/* Add Document Section */}
          <div className="rounded-2xl border border-line bg-bg p-4 space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink">Upload Knowledge Document</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Document Title (e.g. Physics Midterm Formula Sheet)"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                className="h-9 sm:col-span-2 rounded-xl border border-line bg-surface px-3 text-xs focus:border-accent focus:outline-none"
              />
              <select
                value={newDocFaculty}
                onChange={e => setNewDocFaculty(e.target.value)}
                className="h-9 rounded-xl border border-line bg-surface px-3 text-xs font-mono"
              >
                <option value="all">All Faculties</option>
                <option value="foe">Faculty of Engineering</option>
                <option value="fib">Faculty of International Business</option>
                <option value="fcs">Faculty of Computer Science</option>
              </select>
            </div>
            <textarea
              rows={3}
              placeholder="Paste content or summary guidelines here..."
              value={newDocContent}
              onChange={e => setNewDocContent(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs focus:border-accent focus:outline-none"
            />
            <div className="flex justify-end">
              <Button size="sm" variant="accent" onClick={handleAddKnowledge}>
                Add Document to Knowledge Base
              </Button>
            </div>
          </div>

          {/* Document List */}
          <div className="space-y-3">
            {knowledgeDocs.map(doc => (
              <div key={doc.id} className="rounded-2xl border border-line bg-bg p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold">{doc.title}</h4>
                  <span className="label !text-accent">{doc.faculty.toUpperCase()}</span>
                </div>
                <p className="text-xs text-mute leading-relaxed">{doc.content}</p>
                <div className="flex gap-1.5 pt-1">
                  {doc.tags.map(t => (
                    <span key={t} className="font-mono text-[9px] px-2 py-0.5 rounded bg-surface border border-line text-mute">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 6: MEMORY CONFIG ───────────────────────────────────────── */}
      {activeTab === 'memory' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-6">
          <div>
            <h3 className="font-display text-lg font-semibold">Long-Term Memory Directives</h3>
            <p className="text-xs text-mute">Control how Otomo-chan extracts, consolidates, and retains student preferences.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-bg p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.memory_rules.extractionEnabled}
                  onChange={e => setConfig({
                    ...config,
                    memory_rules: { ...config.memory_rules, extractionEnabled: e.target.checked }
                  })}
                  className="rounded accent-accent"
                />
                <span className="text-xs font-semibold">Enable Automatic Memory Extraction</span>
              </label>
              <p className="text-[11px] text-mute">Automatically detects study preferences and ongoing projects from student conversations.</p>
            </div>

            <div className="rounded-2xl border border-line bg-bg p-4 space-y-2">
              <label className="label block">Consolidation Strategy</label>
              <select
                value={config.memory_rules.retentionPolicy}
                onChange={e => setConfig({
                  ...config,
                  memory_rules: { ...config.memory_rules, retentionPolicy: e.target.value as any }
                })}
                className="h-9 w-full rounded-xl border border-line bg-surface px-3 text-xs font-mono"
              >
                <option value="consolidate">Consolidate &amp; Deduplicate (Recommended)</option>
                <option value="keep_recent">Keep Most Recent Only</option>
                <option value="keep_all">Keep All Without Pruning</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: CAPABILITIES & TOOLS ────────────────────────────────── */}
      {activeTab === 'tools' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-6">
          <div>
            <h3 className="font-display text-lg font-semibold">Tool Capabilities &amp; Sandbox</h3>
            <p className="text-xs text-mute">Grant or restrict permissions for Otomo-chan to interact with application features.</p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'lookup_schedule', name: 'Timetable Lookup', desc: 'Allows Otomo-chan to read student schedule and next class.' },
              { id: 'lookup_tasks', name: 'Task Manager Query', desc: 'Allows Otomo-chan to inspect pending assignments and todo items.' },
              { id: 'focus_timer_status', name: 'Focus Timer Status', desc: 'Allows Otomo-chan to check remaining study session duration.' },
              { id: 'lookup_exams', name: 'Exam Calendar Query', desc: 'Allows Otomo-chan to read official midterm and final dates.' },
              { id: 'query_knowledge', name: 'University Knowledge Base', desc: 'Allows Otomo-chan to search university rules and syllabi.' }
            ].map(tool => {
              const enabled = config.tools.enabledTools.includes(tool.id)
              return (
                <div key={tool.id} className="flex items-center justify-between rounded-2xl border border-line bg-bg p-4">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-semibold text-ink">{tool.name}</span>
                    <p className="text-[11px] text-mute">{tool.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...config.tools.enabledTools, tool.id]
                        : config.tools.enabledTools.filter(t => t !== tool.id)
                      setConfig({ ...config, tools: { enabledTools: next } })
                    }}
                    className="h-4 w-4 accent-accent rounded"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 8: VERSIONS & HISTORY ──────────────────────────────────── */}
      {activeTab === 'versions' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Configuration Versions</h3>
              <p className="text-xs text-mute">Manage published versions and roll back if necessary.</p>
            </div>
            <span className="label !text-accent">Active Version: v{config.version}</span>
          </div>

          <div className="rounded-2xl border border-line bg-bg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold">v{config.version} (Current Active)</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Check size={11} /> Published
              </span>
            </div>
            <p className="text-xs text-mute">{config.changelog || 'Latest production release.'}</p>
            {config.published_at && (
              <p className="label !text-[9px]">Published at {new Date(config.published_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 9: FEEDBACK MANAGEMENT DESK ────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Student Feedback Desk</h3>
              <p className="text-xs text-mute">Review and resolve suggestions, complaints, and bug reports from students.</p>
            </div>
            <Button size="sm" variant="line" onClick={loadFeedbacks}>
              Refresh Submissions
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <Filter size={14} className="text-mute shrink-0" />
            {['all', 'new', 'under_review', 'in_progress', 'responded', 'resolved'].map(st => (
              <button
                key={st}
                onClick={() => setFbFilterStatus(st)}
                className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors shrink-0 ${fbFilterStatus === st ? 'bg-accent text-white font-semibold' : 'bg-bg text-mute hover:text-ink'}`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Content Area */}
          {loadingFeedback ? (
            <p className="font-mono text-xs text-mute py-8 text-center">Loading feedback records...</p>
          ) : feedbacks.length === 0 ? (
            <p className="font-mono text-xs text-mute py-8 text-center">No student submissions found matching the criteria.</p>
          ) : selectedFb ? (
            /* Selected Submission Detail & Reply Workbench */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedFb(null)}
                className="text-xs font-mono text-accent hover:underline"
              >
                ← Back to all submissions
              </button>

              <div className="rounded-2xl border border-line bg-bg p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="label !text-accent">{selectedFb.type}</span>
                    <h3 className="font-display text-base font-semibold mt-1">{selectedFb.subject}</h3>
                    <p className="text-xs text-mute">From: {selectedFb.user_name || 'Student'} ({selectedFb.user_email || 'in-app'})</p>
                  </div>
                  <span className="font-mono text-xs uppercase px-2.5 py-1 rounded-full bg-surface border border-line">
                    {selectedFb.status}
                  </span>
                </div>

                <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{selectedFb.description}</p>

                {selectedFb.attachment_url && (
                  <div className="pt-2">
                    <a
                      href={selectedFb.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-accent hover:underline"
                    >
                      View attached screenshot ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                <h4 className="font-display text-sm font-semibold">Developer Reply &amp; Status</h4>

                <div className="flex gap-2">
                  <select
                    value={updatingStatus}
                    onChange={e => setUpdatingStatus(e.target.value as FeedbackStatus)}
                    className="h-10 rounded-xl border border-line bg-bg px-3 text-xs font-mono"
                  >
                    <option value="under_review">Under Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="responded">Responded</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Closed</option>
                  </select>
                </div>

                <textarea
                  rows={4}
                  placeholder="Type your response to the student..."
                  value={adminReply}
                  onChange={e => setAdminReply(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg p-3 text-xs leading-relaxed focus:border-accent focus:outline-none resize-none"
                />

                <div className="flex justify-end gap-2">
                  <Button variant="accent" onClick={handleUpdateFeedback}>
                    <Send size={13} /> Send Response &amp; Update Status
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Submissions List */
            <div className="space-y-2.5">
              {feedbacks
                .filter(fb => fbFilterStatus === 'all' || fb.status === fbFilterStatus)
                .map(fb => (
                  <button
                    key={fb.id}
                    onClick={() => { setSelectedFb(fb); setAdminReply(fb.admin_response || ''); setUpdatingStatus(fb.status) }}
                    className="w-full text-left rounded-2xl border border-line bg-bg hover:border-accent p-4 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="label !text-accent font-semibold">{fb.type}</span>
                        <span className="font-mono text-[10px] text-mute uppercase px-2 py-0.5 rounded bg-surface border border-line">
                          {fb.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-medium text-ink truncate">{fb.subject}</h4>
                      <p className="text-[10px] text-mute">
                        By {fb.user_name || 'Student'} on {new Date(fb.created_at).toLocaleDateString()}
                        {fb.admin_response ? ' · Responded' : ' · Pending reply'}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
