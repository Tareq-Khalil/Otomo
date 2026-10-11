import { motion } from 'motion/react'
import type { Row } from '@/lib/schedule'
import { info } from '@/lib/schedule'
import { clock, dur, mins } from '@/lib/time'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

/** one class, drawn as a ticket: time on the stub, details on the body, course colour as the spine */
export function Ticket({ e, state, onClick, i = 0 }: { e: Row; state?: 'now' | 'next' | 'done' | ''; onClick?: () => void; i?: number }) {
  const { data } = useApp()
  const c = e.own ? { name: e.course, color: 'var(--accent)' } : info(data, e.course)
  const [t, ap] = clock(e.start).split(' ')
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: state === 'done' ? .5 : 1, y: 0 }}
      transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 26 }}
      whileTap={{ scale: .985 }} onClick={onClick}
      className={cn('ticket flex w-full items-stretch text-left', state === 'now' && 'border-accent')}
      style={{ borderLeft: `5px solid ${c.color}` }}
    >
      <div className="flex w-[4.6rem] shrink-0 flex-col items-center justify-center py-3">
        <span className="font-display text-xl font-semibold leading-none">{t}</span>
        <span className="label mt-1">{ap}</span>
      </div>
      <div className="perf my-2" />
      <div className="min-w-0 flex-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <b className="truncate text-[15px] leading-tight">{c.name}</b>
          {state === 'now' && <span className="label rounded-sm bg-accent px-1.5 py-0.5 !text-white">Live</span>}
          {state === 'next' && <span className="label rounded-sm border border-ink px-1.5 py-0.5 !text-ink">Next</span>}
        </div>
        <p className="label mt-1.5 truncate !normal-case !tracking-wide">
          {[e.title, dur(mins(e.end) - mins(e.start)), e.room].filter(Boolean).join(' · ')}
        </p>
      </div>
    </motion.button>
  )
}
