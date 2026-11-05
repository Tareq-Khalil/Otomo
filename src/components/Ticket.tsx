import { motion } from 'motion/react'
import type { Row } from '@/lib/schedule'
import { info } from '@/lib/schedule'
import { clock, dur, mins } from '@/lib/time'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { GraduationCap, MapPin } from 'lucide-react'

export function Ticket({
  e,
  state,
  onClick,
  i = 0
}: {
  e: Row
  state?: 'now' | 'next' | 'done' | ''
  onClick?: () => void
  i?: number
}) {
  const { data } = useApp()
  const isPersonal = Boolean(e.own || e.ownEventId)
  const c = isPersonal
    ? { name: e.course, color: 'var(--accent)' }
    : e.isExam
    ? { name: `${e.course} Midterm Examination`, color: '#eab308' }
    : info(data, e.course)

  const [t, ap] = clock(e.start).split(' ')

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: state === 'done' ? 0.5 : 1, y: 0 }}
      transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 26 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        'ticket flex w-full items-stretch text-left transition-all',
        state === 'now' && 'border-accent shadow-md shadow-accent/10',
        e.isExam && 'border-gold/60 bg-surface/90 shadow-sm ring-1 ring-gold/20'
      )}
      style={{ borderLeft: `5px solid ${e.isExam ? '#eab308' : c.color}` }}
    >
      <div className="flex w-[4.6rem] shrink-0 flex-col items-center justify-center py-3">
        <span className="font-display text-xl font-semibold leading-none">{t}</span>
        <span className="label mt-1">{ap}</span>
      </div>
      <div className="perf my-2" />
      <div className="min-w-0 flex-1 px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <b className="truncate text-[15px] leading-tight text-ink">{c.name}</b>
          {e.isExam && (
            <span className="label inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 !text-gold font-semibold !text-[9px]">
              <GraduationCap size={11} /> Midterm
            </span>
          )}
          {state === 'now' && (
            <span className="label rounded-sm bg-accent px-1.5 py-0.5 !text-white flex items-center gap-1">
              <i className="live-dot" /> Live
            </span>
          )}
          {state === 'next' && (
            <span className="label rounded-sm border border-ink px-1.5 py-0.5 !text-ink">Next</span>
          )}
        </div>

        {e.isExam && e.subtitle && (
          <p className="text-xs text-mute mt-0.5 italic">{e.subtitle}</p>
        )}

        {/* CHANGED: Added flex-wrap and changed items-center to items-start */}
        <div className="flex flex-wrap items-start gap-2 mt-1.5">
          <p className="label truncate !normal-case !tracking-wide mt-0.5">
            {[e.title, dur(mins(e.end) - mins(e.start))].filter(Boolean).join(' · ')}
          </p>
          {e.room && (
            <span className={cn(
              // CHANGED: Added max-w-full, items-start, whitespace-normal, and text-left
              'label inline-flex max-w-full items-start gap-1 rounded px-1.5 py-0.5 !normal-case !tracking-normal font-mono text-[10px] text-left',
              e.isExam ? 'bg-gold/10 text-gold font-medium border border-gold/20' : 'bg-surface text-mute'
            )}>
              {/* CHANGED: Added shrink-0 and top margin so the pin aligns with wrapped text */}
              <MapPin size={10} className="shrink-0 mt-[2px]" />
              {/* CHANGED: Added line-clamp and break-words so the text wraps safely */}
              <span className="line-clamp-2 whitespace-normal break-words">{e.room}</span>
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}