import { useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen, Check, Flame } from 'lucide-react'

const PRACTICE_KEY = 'otomo:japanese-practice'

const phrases = [
  {
    japanese: 'おはようございます',
    romaji: 'Ohayō gozaimasu',
    meaning: 'Good morning (polite)',
    example: 'おはようございます、先生。',
    exampleRomaji: 'Ohayō gozaimasu, sensei.',
    exampleMeaning: 'Good morning, professor.',
    choices: ['Good morning (polite)', 'Excuse me', 'Thank you']
  },
  {
    japanese: 'よろしくお願いします',
    romaji: 'Yoroshiku onegaishimasu',
    meaning: 'Nice to meet you; I look forward to working with you',
    example: 'これからよろしくお願いします。',
    exampleRomaji: 'Kore kara yoroshiku onegaishimasu.',
    exampleMeaning: 'I look forward to working with you.',
    choices: ['Please wait a moment', 'Nice to meet you; I look forward to working with you', 'I understand']
  },
  {
    japanese: 'もう一度お願いします',
    romaji: 'Mō ichido onegaishimasu',
    meaning: 'One more time, please',
    example: 'すみません、もう一度お願いします。',
    exampleRomaji: 'Sumimasen, mō ichido onegaishimasu.',
    exampleMeaning: 'Sorry, one more time, please.',
    choices: ['One more time, please', 'Where is the classroom?', 'I have a question']
  },
  {
    japanese: '分かりました',
    romaji: 'Wakarimashita',
    meaning: 'I understand',
    example: 'はい、分かりました。',
    exampleRomaji: 'Hai, wakarimashita.',
    exampleMeaning: 'Yes, I understand.',
    choices: ['I am studying', 'I understand', 'Good evening']
  },
  {
    japanese: '質問があります',
    romaji: 'Shitsumon ga arimasu',
    meaning: 'I have a question',
    example: '先生、質問があります。',
    exampleRomaji: 'Sensei, shitsumon ga arimasu.',
    exampleMeaning: 'Professor, I have a question.',
    choices: ['I have a question', 'I am late', 'Please help me']
  },
  {
    japanese: '少し休みましょう',
    romaji: 'Sukoshi yasumimashō',
    meaning: "Let's take a short break",
    example: 'ここで少し休みましょう。',
    exampleRomaji: 'Koko de sukoshi yasumimashō.',
    exampleMeaning: "Let's take a short break here.",
    choices: ["Let's take a short break", 'Let us begin the lecture', 'Please write it down']
  },
  {
    japanese: 'お疲れさまです',
    romaji: 'Otsukaresama desu',
    meaning: 'Thanks for your hard work',
    example: '今日もお疲れさまです。',
    exampleRomaji: 'Kyō mo otsukaresama desu.',
    exampleMeaning: 'Thanks for your hard work today, too.',
    choices: ['Good luck tomorrow', 'Thanks for your hard work', 'I am very busy']
  }
]

interface PracticeProgress {
  streak: number
  lastCompleted: string | null
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readProgress(): PracticeProgress {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PRACTICE_KEY) ?? 'null')
    if (
      typeof saved === 'object' &&
      saved !== null &&
      'streak' in saved &&
      typeof saved.streak === 'number' &&
      'lastCompleted' in saved &&
      (typeof saved.lastCompleted === 'string' || saved.lastCompleted === null)
    ) {
      return { streak: saved.streak, lastCompleted: saved.lastCompleted }
    }
  } catch (error) {
    console.warn('Could not read Japanese practice progress:', error)
  }
  return { streak: 0, lastCompleted: null }
}

export function JapanesePractice() {
  const today = new Date()
  const todayKey = localDateKey(today)
  const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000)
  const phraseIndex = dayNumber % phrases.length
  const phrase = phrases[phraseIndex]
  const [progress, setProgress] = useState(readProgress)
  const [answer, setAnswer] = useState<string | null>(null)
  const completed = progress.lastCompleted === todayKey

  const chooseAnswer = (choice: string) => {
    setAnswer(choice)
    if (choice !== phrase.meaning || completed) return

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const nextProgress: PracticeProgress = {
      streak: progress.lastCompleted === localDateKey(yesterday) ? progress.streak + 1 : 1,
      lastCompleted: todayKey
    }
    setProgress(nextProgress)
    try {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify(nextProgress))
    } catch (error) {
      console.warn('Could not save Japanese practice progress:', error)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="japanese-practice-title"
      className="mb-6 rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="japanese-practice-title" className="font-display text-2xl italic">
            Japanese, one phrase at a time
          </h2>
          <p className="label mt-1">今日の日本語 · Today's Japanese</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-mute" aria-label={`${progress.streak} day practice streak`}>
          <Flame size={14} className={progress.streak ? 'text-accent' : 'text-mute'} />
          {progress.streak} day{progress.streak === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="jp text-3xl font-semibold text-ink" lang="ja">{phrase.japanese}</p>
          <p className="mt-1 text-sm text-mute">{phrase.romaji}</p>
        </div>
        <span className="label inline-flex items-center gap-1.5">
        <BookOpen size={13} className="text-accent" /> Phrase {phraseIndex + 1} of {phrases.length}
        </span>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-sm font-medium text-ink">What does it mean?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {phrase.choices.map(choice => {
            const correct = choice === phrase.meaning
            const selected = answer === choice
            return (
              <button
                key={choice}
                type="button"
                onClick={() => chooseAnswer(choice)}
                aria-pressed={selected}
                className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  selected && correct
                    ? 'border-accent bg-accent/10 text-ink'
                    : selected
                      ? 'border-gold/50 bg-gold/10 text-ink'
                      : 'border-line bg-bg text-ink hover:border-accent/50'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  {choice}
                  {selected && correct && <Check size={15} className="shrink-0 text-accent" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="mt-3 min-h-5 text-sm text-mute" aria-live="polite">
        {completed
          ? 'Nicely done. Come back tomorrow for another phrase.'
          : answer === phrase.meaning
            ? <>{phrase.example} <span className="jp">{phrase.exampleRomaji}</span> — {phrase.exampleMeaning}</>
            : answer
              ? "Not quite. Try another choice; I'll wait."
              : 'Choose the meaning to reveal an example.'}
      </p>
    </motion.section>
  )
}
