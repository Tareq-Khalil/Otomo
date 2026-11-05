import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, MessageCircle, Heart, Star } from 'lucide-react'
import { OtomoCharacter, type MascotMood } from './OtomoCharacter'
import { useApp } from '@/lib/store'
import { useTasks } from '@/lib/tasks'
import { useExams, getExamForDate, isMidtermWeek } from '@/lib/exams'
import { iso } from '@/lib/time'

const ANIME_QUOTES = [
  { text: 'One step at a time! 一歩一歩進もう！', mood: 'cheering' as MascotMood, sfx: 'ファイト！' },
  { text: 'Remember to take breaks and drink water! ', mood: 'resting' as MascotMood, sfx: 'ほっこり' },
  { text: 'Focus on today’s missions. You can do it! ', mood: 'studying' as MascotMood, sfx: 'よしっ！' },
  { text: 'Your efforts today will bloom like sakura tomorrow! ', mood: 'happy' as MascotMood, sfx: 'キラキラ' },
  { text: 'Otomo is always here by your side! 供にお供します！', mood: 'welcome' as MascotMood, sfx: 'いつも一緒' }
]

export function AnimeCompanion() {
  const { s } = useApp()
  const { tasks } = useTasks()
  const todayIso = iso(new Date())
  const { examData } = useExams(s.faculty || 'foe', s.level || 1)
  const todayExam = getExamForDate(examData, todayIso)
  const inMidterm = isMidtermWeek(examData, todayIso)

  const openTasks = tasks.filter(t => t.status !== 'done').length

  const [quoteIdx, setQuoteIdx] = useState(0)
  const [tapReaction, setTapReaction] = useState(false)

  const userHandle = s.username ? `@${s.username}` : (s.name || 'friend')

  // Contextual initial message
  let primaryMsg = `Konnichiwa, ${userHandle}! Let’s make today productive!`
  let defaultMood: MascotMood = 'welcome'

  if (todayExam) {
    primaryMsg = `Midterm exam today, ${userHandle}: ${todayExam.courseCode} in Building 18! You’ve got this! 応援してるよ！`
    defaultMood = 'cheering'
  } else if (inMidterm) {
    primaryMsg = `Midterm week, ${userHandle}! Review your lecture notes and stay calm! 必勝！`
    defaultMood = 'studying'
  } else if (openTasks === 0 && tasks.length > 0) {
    primaryMsg = `All tasks cleared, ${userHandle}! Sugoi! Enjoy your day! 完璧だね！`
    defaultMood = 'happy'
  } else if (openTasks > 0) {
    primaryMsg = `${openTasks} task${openTasks > 1 ? 's' : ''} left today, ${userHandle}. Let’s tackle them together!`
    defaultMood = 'studying'
  }

  const currentQuote = ANIME_QUOTES[quoteIdx % ANIME_QUOTES.length]
  const displayMsg = quoteIdx === 0 ? primaryMsg : currentQuote.text
  const currentMood = quoteIdx === 0 ? defaultMood : currentQuote.mood

  const handleTap = () => {
    setQuoteIdx(prev => prev + 1)
    setTapReaction(true)
    setTimeout(() => setTapReaction(false), 900)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-surface/80 p-4 shadow-sm backdrop-blur-md"
    >
      {/* Background ambient sakura glow */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3">
        {/* Interactive Otomo-chan avatar */}
        <button
          type="button"
          onClick={handleTap}
          title="Tap Otomo-chan!"
          className="relative shrink-0 group focus:outline-none"
        >
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
            whileTap={{ scale: 0.92 }}
            className="cursor-pointer"
          >
            <OtomoCharacter mood={currentMood} size="sm" />
          </motion.div>

          {/* Floating Tap Reaction Particles */}
          <AnimatePresence>
            {tapReaction && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: -24, scale: 1.2 }}
                exit={{ opacity: 0, y: -34 }}
                transition={{ duration: 0.7 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1 font-mono text-xs text-accent font-bold"
              >
                <Heart size={14} className="fill-accent text-accent animate-ping" />
                <span className="label !text-accent !text-[10px] whitespace-nowrap bg-surface/90 px-1.5 py-0.5 rounded-full border border-accent/20">
                  {currentQuote.sfx}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Speech Bubble */}
        <div className="min-w-0 flex-1">
          <div className="relative rounded-2xl border border-line bg-bg p-3 shadow-inner">
            {/* Bubble pointer triangle */}
            <div className="absolute -left-2 top-4 h-3 w-3 -rotate-45 border-l border-t border-line bg-bg" />

            <div className="flex items-center justify-between mb-1">
              <span className="label !text-accent flex items-center gap-1 !text-[9px]">
                <Sparkles size={11} /> Otomo-chan · お供ちゃん
              </span>
              <span className="text-[10px] text-mute font-mono">tap for tips ↗</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={displayMsg}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-ink leading-relaxed font-medium"
              >
                {displayMsg}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

