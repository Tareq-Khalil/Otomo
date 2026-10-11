import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Plus, X } from 'lucide-react'
import { Head } from '@/components/Head'
import { Button } from '@/components/ui/button'
import { uid, useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Tasks() {
  const { s, set, data } = useApp()
  const [t, setT] = useState(''), [c, setC] = useState('General')
  const add = () => { if (!t.trim()) return; set({ tasks: [{ id: uid(), t: t.trim(), c, done: false }, ...s.tasks] }); setT('') }
  const rows = [...s.tasks].sort((a, b) => +a.done - +b.done)
  return (
    <>
      <Head kicker={`${s.tasks.filter(x => !x.done).length} open`} title="To do." />
      <form className="mb-6 flex gap-2" onSubmit={e => { e.preventDefault(); add() }}>
        <input value={t} onChange={e => setT(e.target.value)} maxLength={120} placeholder="Homework, revision, anything…" className="h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-base" />
        <select value={c} onChange={e => setC(e.target.value)} aria-label="Course" className="h-11 w-24 rounded-md border border-line bg-bg px-2 text-sm">
          {['General', ...Object.keys(data.courses)].map(k => <option key={k}>{k}</option>)}
        </select>
        <Button variant="accent" size="icon" type="submit" aria-label="Add task"><Plus size={18} /></Button>
      </form>
      {rows.length === 0 && <p className="label">Nothing here yet. Add your first task.</p>}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map(x => (
            <motion.li key={x.id} layout initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }} className="flex items-center gap-3 rounded-lg border border-line px-3 py-3">
              <button aria-label={x.done ? 'Mark open' : 'Mark done'} onClick={() => set({ tasks: s.tasks.map(y => (y.id === x.id ? { ...y, done: !y.done } : y)) })}
                className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-sm border', x.done ? 'border-accent bg-accent text-white' : 'border-ink')}>
                {x.done && <Check size={14} strokeWidth={3} />}
              </button>
              <div className={cn('min-w-0 flex-1', x.done && 'opacity-50 line-through')}><p className="truncate">{x.t}</p><p className="label">{x.c}</p></div>
              <button aria-label="Delete" className="text-mute hover:text-accent" onClick={() => set({ tasks: s.tasks.filter(y => y.id !== x.id) })}><X size={16} /></button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  )
}
