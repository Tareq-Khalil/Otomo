import { useState, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  MessageSquarePlus,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Bug,
  Lightbulb,
  X,
  History,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { getAccessToken, useSync } from '@/lib/sync'
import {
  submitFeedback,
  getMyFeedback,
  getPendingLocalFeedback,
  flushPendingFeedback,
  validateAttachment,
  uploadAttachment
} from '@/lib/feedback'
import type { FeedbackSubmission, FeedbackType, FeedbackStatus } from '@/lib/types'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { s } = useApp()
  const sync = useSync()

  const [tab, setTab] = useState<'submit' | 'history'>('submit')
  const [type, setType] = useState<FeedbackType>('suggestion')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [contactPref, setContactPref] = useState('in_app')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successRef, setSuccessRef] = useState<string | null>(null)

  // Submissions history
  const [history, setHistory] = useState<FeedbackSubmission[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<FeedbackSubmission | null>(null)

  // Load history when opening history tab
  useEffect(() => {
    if (tab === 'history') {
      void loadHistory()
    }
  }, [tab, sync.signedIn])

  const loadHistory = async () => {
    setLoadingHistory(true)
    const localPending = getPendingLocalFeedback()
    try {
      const token = await getAccessToken()
      if (token) {
        await flushPendingFeedback(token).catch(() => 0)
        const items = await getMyFeedback(token)
        const stillPending = getPendingLocalFeedback()
        setHistory([...stillPending, ...items])
      } else {
        setHistory(localPending)
      }
    } catch {
      setHistory(localPending)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    if (!selected) {
      setFile(null)
      setFileError(null)
      return
    }
    const err = validateAttachment(selected)
    if (err) {
      setFile(null)
      setFileError(err)
    } else {
      setFile(selected)
      setFileError(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Please complete both the subject and description.')
      return
    }

    setBusy(true)
    setErrorMsg('')

    try {
      let attachmentUrl: string | undefined = undefined

      const token = (await getAccessToken()) ?? ''

      if (file && token) {
        try {
          attachmentUrl = await uploadAttachment(token, file)
        } catch (uploadErr) {
          console.warn('Attachment upload failed, proceeding without attachment:', uploadErr)
        }
      }

      const submission = await submitFeedback(token, {
        type,
        subject: subject.trim(),
        description: description.trim(),
        user_email: sync.email || undefined,
        user_name: s.name || s.username || undefined,
        attachment_url: attachmentUrl,
        contact_pref: contactPref
      })

      setSuccessRef(submission.id)
      setSubject('')
      setDescription('')
      setFile(null)
    } catch (err) {
      // Graceful offline fallback: store locally
      const localId = `local-${Date.now().toString(36)}`
      const localSubmission: FeedbackSubmission = {
        id: localId,
        user_email: sync.email || undefined,
        user_name: s.name || s.username || undefined,
        type,
        subject: subject.trim(),
        description: description.trim(),
        contact_pref: contactPref,
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        const saved = JSON.parse(localStorage.getItem('uh:pending_feedback') || '[]')
        saved.push(localSubmission)
        localStorage.setItem('uh:pending_feedback', JSON.stringify(saved))
      } catch { }

      setSuccessRef(localId)
      setSubject('')
      setDescription('')
      setFile(null)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const getStatusBadge = (status: FeedbackStatus) => {
    const config: Record<FeedbackStatus, { label: string; class: string }> = {
      new: { label: 'New', class: 'bg-zinc-500/10 text-mute border-line' },
      under_review: { label: 'Under Review', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      in_progress: { label: 'In Progress', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      responded: { label: 'Responded', class: 'bg-accent/10 text-accent border-accent/20' },
      resolved: { label: 'Resolved', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      rejected: { label: 'Closed', class: 'bg-zinc-500/10 text-mute border-line' }
    }
    const item = config[status] || config.new
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${item.class}`}>
        {item.label}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl border border-line bg-surface text-ink shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="seal !h-8 !w-8 !text-sm">供</span>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight">Suggestions & Complaints</h2>
              <p className="label !text-[9px]">Help us refine Otomo for all students</p>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-line bg-bg/50 px-6 pt-2">
          <button
            onClick={() => { setTab('submit'); setSuccessRef(null) }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${tab === 'submit' ? 'border-accent text-accent font-semibold' : 'border-transparent text-mute hover:text-ink'}`}
          >
            <MessageSquarePlus size={14} /> Send Feedback
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${tab === 'history' ? 'border-accent text-accent font-semibold' : 'border-transparent text-mute hover:text-ink'}`}
          >
            <History size={14} /> My Submissions
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'submit' ? (
            successRef ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-accent">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-medium">Thank you for your feedback!</h3>
                  <p className="mt-1 text-sm text-mute">Your submission has been received and logged.</p>
                  <p className="mt-3 font-mono text-xs text-accent bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/20 inline-block">
                    Ref ID: #{successRef.slice(0, 8)}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="line" onClick={() => setSuccessRef(null)}>
                    Submit Another
                  </Button>
                  <Button variant="accent" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Feedback Type Selector */}
                <div>
                  <label className="label block mb-2">Feedback Category</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { id: 'suggestion', label: 'Suggestion', icon: Lightbulb },
                      { id: 'complaint', label: 'Complaint', icon: AlertCircle },
                      { id: 'bug', label: 'Bug Report', icon: Bug },
                      { id: 'other', label: 'Other', icon: HelpCircle }
                    ].map(item => {
                      const Icon = item.icon
                      const active = type === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setType(item.id as FeedbackType)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs transition-colors ${active ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-line bg-bg hover:border-ink/30 text-mute'}`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="fb-subject" className="label block mb-1">Subject</label>
                  <input
                    id="fb-subject"
                    type="text"
                    required
                    maxLength={150}
                    placeholder="Brief summary of your topic..."
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="fb-desc" className="label block mb-1">Description &amp; Details</label>
                  <textarea
                    id="fb-desc"
                    required
                    rows={4}
                    maxLength={5000}
                    placeholder="Explain in detail what you noticed, suggested improvements, or issues encountered..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-line bg-bg p-3 text-sm leading-relaxed focus:border-accent focus:outline-none resize-none"
                  />
                </div>

                {/* Attachment */}
                <div>
                  <label className="label block mb-1">Attachment (Optional screenshot, max 5MB)</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-line bg-bg px-3 py-2 text-xs font-mono text-mute hover:border-accent hover:text-ink transition-colors">
                      <Paperclip size={14} />
                      <span>{file ? file.name : 'Choose file...'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    {file && (
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-xs text-accent hover:underline font-mono"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {fileError && <p className="mt-1 text-xs text-accent">{fileError}</p>}
                </div>

                {/* Contact Preference */}
                <div>
                  <label className="label block mb-1">Contact Preference</label>
                  <select
                    value={contactPref}
                    onChange={e => setContactPref(e.target.value)}
                    className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs focus:border-accent focus:outline-none"
                  >
                    <option value="in_app">In-App Notification (Recommended)</option>
                    <option value="email">Email Response (if registered)</option>
                    <option value="none">No response needed (Anonymous contribution)</option>
                  </select>
                </div>

                {errorMsg && (
                  <p className="text-xs text-accent bg-accent/10 p-2.5 rounded-xl border border-accent/20">
                    {errorMsg}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" disabled={busy}>
                    <Send size={14} />
                    {busy ? 'Submitting...' : 'Send Feedback'}
                  </Button>
                </div>
              </form>
            )
          ) : (
            /* Submissions History */
            <div className="space-y-3">
              {loadingHistory ? (
                <p className="text-center py-8 text-xs font-mono text-mute">Loading past submissions...</p>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-mute space-y-2">
                  <History size={24} className="mx-auto opacity-40" />
                  <p className="text-xs">You haven't submitted any feedback yet.</p>
                </div>
              ) : selectedSubmission ? (
                /* Detail View */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
                  >
                    ← Back to all submissions
                  </button>
                  <div className="rounded-2xl border border-line bg-bg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-semibold">{selectedSubmission.subject}</h3>
                      {getStatusBadge(selectedSubmission.status)}
                    </div>
                    <p className="text-xs text-ink/80 leading-relaxed whitespace-pre-wrap">{selectedSubmission.description}</p>
                    <p className="label !text-[9px]">
                      Submitted on {new Date(selectedSubmission.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {selectedSubmission.admin_response ? (
                    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="seal !h-6 !w-6 !text-xs">供</span>
                        <h4 className="font-display text-sm font-semibold text-accent">Developer Response</h4>
                      </div>
                      <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{selectedSubmission.admin_response}</p>
                      {selectedSubmission.responded_at && (
                        <p className="label !text-[9px]">
                          Answered on {new Date(selectedSubmission.responded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line bg-surface p-3 text-xs text-mute flex items-center gap-2">
                      <Clock size={14} />
                      <span>Under review by the developer. Check back soon for an update!</span>
                    </div>
                  )}
                </div>
              ) : (
                /* List View */
                history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSubmission(item)}
                    className="w-full text-left rounded-2xl border border-line bg-surface hover:border-accent p-3.5 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="label !text-accent font-semibold">{item.type}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      <h4 className="text-xs font-medium text-ink truncate">{item.subject}</h4>
                      <p className="text-[10px] text-mute">
                        {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {item.admin_response && ' · 1 reply available'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-mute shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
