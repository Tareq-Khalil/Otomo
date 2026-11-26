import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Eye,
  Flame,
  MessageCircle,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react'
import {
  localDateKey,
  pickBonusPhrase,
  pickDailyPhrase,
  readPracticeState,
  savePracticeState,
  type JapanesePhrase,
  type JapanesePracticeState
} from '@/lib/japanese/dailyPhrase'

const CATEGORY_LABELS: Record<JapanesePhrase['category'], string> = {
  campus: 'Campus',
  study: 'Study',
  coding: 'Coding & Lab',
  daily: 'Everyday',
  social: 'Social',
  nuance: 'Nuance'
}

export function JapanesePractice() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<JapanesePracticeState>(readPracticeState)
  const todayKey = localDateKey()
  const [phrase, setPhrase] = useState<JapanesePhrase>(() => pickDailyPhrase(new Date(), readPracticeState()))
  const [isBonus, setIsBonus] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [meaningRevealed, setMeaningRevealed] = useState(false)
  const [showDialogue, setShowDialogue] = useState(false)
  const [copiedPhrase, setCopiedPhrase] = useState(false)

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(`${phrase.japanese} — ${phrase.romaji}\n${phrase.english}`)
      setCopiedPhrase(true)
      window.setTimeout(() => setCopiedPhrase(false), 1800)
    } catch {
      setCopiedPhrase(false)
    }
  }

  const dailyCompleted = state.lastCompleted === todayKey

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isChoiceCorrect = (idx: number): boolean => {
    const ch = phrase.challenge
    if (ch.type === 'reply') return idx === ch.answerIndex
    return ch.choices[idx] === ch.answer
  }

  const handleSelectChoice = (idx: number) => {
    setSelectedIdx(idx)
    if (!isChoiceCorrect(idx)) return

    setMeaningRevealed(true)
    setShowDialogue(true)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = localDateKey(yesterday)

    const nextCompletedIds = state.completedIds.includes(phrase.id)
      ? state.completedIds
      : [...state.completedIds, phrase.id]
    const nextRecentIds = [...state.recentIds.filter(id => id !== phrase.id), phrase.id].slice(-12)

    const nextState: JapanesePracticeState = {
      streak: dailyCompleted
        ? state.streak
        : state.lastCompleted === yesterdayKey
          ? state.streak + 1
          : 1,
      lastCompleted: dailyCompleted ? state.lastCompleted : todayKey,
      completedIds: nextCompletedIds,
      recentIds: nextRecentIds,
      totalCompleted: state.totalCompleted + (state.completedIds.includes(phrase.id) ? 0 : 1)
    }
    setState(nextState)
    savePracticeState(nextState)
  }

  const handleLoadBonus = () => {
    const next = pickBonusPhrase(phrase.id, state)
    setPhrase(next)
    setIsBonus(true)
    setSelectedIdx(null)
    setMeaningRevealed(false)
    setShowDialogue(false)
    setCopiedPhrase(false)
  }

  const handleBackToDaily = () => {
    setPhrase(pickDailyPhrase(new Date(), state))
    setIsBonus(false)
    setSelectedIdx(null)
    setMeaningRevealed(dailyCompleted)
    setShowDialogue(false)
    setCopiedPhrase(false)
  }

  const answeredCorrectly = selectedIdx !== null && isChoiceCorrect(selectedIdx)
  const answeredWrong = selectedIdx !== null && !answeredCorrectly
  const showFullMeaning = meaningRevealed || answeredCorrectly || (!isBonus && dailyCompleted)

  return (
    <>
      {/* Discreet Floating Side Tab (Collapsed by default) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(true)}
            aria-label="Open Daily Japanese Phrase"
            aria-expanded={false}
            className="fixed right-0 top-[42%] z-30 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-line bg-surface/90 px-2 py-3 text-ink shadow-lg backdrop-blur-md transition-colors hover:border-accent/60 hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 font-display text-xs font-semibold text-accent">
              日
              {!dailyCompleted && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"
                />
              )}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-mute [writing-mode:vertical-rl]">
              Phrase
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-over Compact Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-modal="false"
              aria-labelledby="daily-jp-heading"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="fixed inset-y-3 right-3 z-50 flex w-[min(92vw,24rem)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="seal !h-7 !w-7 !text-sm">日</span>
                    <div>
                      <h2 id="daily-jp-heading" className="font-display text-xl font-semibold italic leading-none">
                        {isBonus ? 'Bonus Phrase' : 'A phrase for today'}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-mute">
                        <CalendarDays size={10} />
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-bg px-2.5 py-1 font-mono text-[11px] text-mute"
                    title="Daily streak"
                  >
                    <Flame size={12} className={state.streak ? 'text-accent' : 'text-mute'} />
                    {state.streak}d
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close Japanese phrase panel"
                    className="grid h-8 w-8 place-items-center rounded-full text-mute transition-colors hover:bg-bg hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {/* Otomo-chan's Intro */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-bg/70 p-3">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
                  <p className="text-xs leading-relaxed text-ink/90">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-accent">Otomo-chan: </span>
                    {phrase.otomoIntro}
                  </p>
                </div>

                {/* Phrase Showcase */}
                <div className="relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_40%),var(--bg)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mute">
                      {CATEGORY_LABELS[phrase.category]} · {phrase.difficulty}
                    </p>
                    <button
                      type="button"
                      onClick={copyPhrase}
                      aria-label="Copy phrase"
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[10px] text-mute transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      {copiedPhrase ? <Check size={12} /> : <Copy size={12} />}
                      {copiedPhrase ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="jp text-[2rem] font-semibold leading-tight text-ink" lang="ja">
                    {phrase.japanese}
                  </p>
                  {phrase.kana !== phrase.japanese && (
                    <p className="jp mt-1 text-xs text-mute" lang="ja">{phrase.kana}</p>
                  )}
                  <p className="mt-1 font-mono text-xs text-accent">{phrase.romaji}</p>

                  {showFullMeaning ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 space-y-1.5 border-t border-line pt-3"
                    >
                      <p className="text-sm font-medium text-ink">{phrase.english}</p>
                      <p className="text-sm text-mute" dir="rtl" lang="ar">{phrase.arabic}</p>
                      <p className="pt-1 text-xs leading-relaxed text-mute">{phrase.context}</p>
                    </motion.div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMeaningRevealed(true)}
                      className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-mute transition-colors hover:text-accent"
                    >
                      <Eye size={13} /> Peek at meaning
                    </button>
                  )}
                </div>

                {/* Interactive Challenge */}
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-ink">{phrase.challenge.prompt}</p>
                  {phrase.challenge.type === 'reply' && (
                    <p className="font-mono text-[11px] text-mute">Situation: {phrase.challenge.situation}</p>
                  )}

                  <div className="space-y-2">
                    {phrase.challenge.choices.map((choice, idx) => {
                      const selected = selectedIdx === idx
                      const correct = isChoiceCorrect(idx)
                      const label = typeof choice === 'string' ? choice : choice.jp
                      const sub = typeof choice === 'string' ? null : `${choice.romaji} · ${choice.en}`

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleSelectChoice(idx)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                            selected && correct
                              ? 'border-accent bg-accent/10 text-ink'
                              : selected
                                ? 'border-gold/50 bg-gold/10 text-ink'
                                : 'border-line bg-bg text-ink hover:border-accent/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={typeof choice === 'string' ? 'font-medium' : 'jp text-sm font-semibold text-ink'}>
                              {label}
                            </span>
                            {selected && correct && <Check size={14} className="shrink-0 text-accent" />}
                          </div>
                          {sub && (
                            <span className="mt-0.5 block font-mono text-[10px] text-mute">
                              {sub}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Feedback */}
                  <div aria-live="polite" className="min-h-5">
                    {answeredCorrectly && (
                      <p className="rounded-xl border border-accent/25 bg-accent/5 p-2.5 text-xs text-ink">
                        {phrase.challenge.feedbackCorrect}
                      </p>
                    )}
                    {answeredWrong && (
                      <p className="rounded-xl border border-gold/30 bg-gold/10 p-2.5 text-xs text-ink">
                        {phrase.challenge.feedbackWrong}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mini Dialogue & Cultural Tip */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowDialogue(v => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink transition-colors hover:border-accent/40"
                  >
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                      <MessageCircle size={13} className="text-accent" />
                      Mini dialogue &amp; usage tip
                    </span>
                    <ChevronRight size={14} className={`text-mute transition-transform ${showDialogue ? 'rotate-90' : ''}`} />
                  </button>

                  {showDialogue && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 rounded-2xl border border-line bg-bg/60 p-3 text-xs"
                    >
                      <div className="space-y-2.5">
                        {phrase.dialogue.map((line, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: i % 2 ? 8 : -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 ${i % 2 ? 'rounded-br-md bg-accent text-white' : 'rounded-bl-md border border-line bg-surface text-ink'}`}>
                              <p className={`mb-1 font-mono text-[9px] uppercase tracking-wider ${i % 2 ? 'text-white/70' : 'text-accent'}`}>
                                {line.speaker}
                              </p>
                              <p className="jp text-sm font-semibold" lang="ja">{line.jp}</p>
                              <p className={`mt-1 font-mono text-[9px] ${i % 2 ? 'text-white/70' : 'text-mute'}`}>{line.romaji}</p>
                              <p className={`mt-1 text-[11px] ${i % 2 ? 'text-white/90' : 'text-mute'}`}>{line.en}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-accent/15 bg-accent/5 px-3 py-2.5 text-[11px] leading-relaxed text-mute">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-accent">Otomo tip · </span>
                        {phrase.tip}
                      </div>

                      {phrase.variation && (
                        <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-[11px]">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-mute">{phrase.variation.label}: </span>
                          <span className="jp font-medium text-ink" lang="ja">{phrase.variation.jp}</span>{' '}
                          <span className="font-mono text-mute">({phrase.variation.romaji})</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-line bg-bg/50 px-4 py-3">
                <span className="font-mono text-[10px] text-mute">
                  {state.completedIds.length}/{24} phrases explored
                </span>
                <div className="flex items-center gap-2">
                  {isBonus && (
                    <button
                      type="button"
                      onClick={handleBackToDaily}
                      className="rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-mute hover:text-ink"
                    >
                      Today's
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLoadBonus}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    <RefreshCw size={12} />
                    Try another
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
