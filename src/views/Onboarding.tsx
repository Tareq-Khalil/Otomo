import { useState } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { secsOf } from '@/lib/time'
import { cn } from '@/lib/utils'

export function Onboarding() {
  const { set } = useApp()
  const [name, setName] = useState(''), [g, setG] = useState(0), [sec, setSec] = useState(0)
  const chip = (on: boolean) => cn('h-11 w-11 rounded-md border font-mono text-sm', on ? 'border-ink bg-ink text-bg' : 'border-line')
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 overflow-y-auto bg-bg px-6 py-[calc(3rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-xl">
        <p className="label">Welcome to Otomo</p>
        <h1 className="mb-8 mt-2 font-display text-6xl font-light italic leading-[.9]">Let's set up your week.</h1>
        <label className="label block">Your name
          <input value={name} maxLength={24} onChange={e => setName(e.target.value)} className="mt-1 h-12 w-full rounded-md border border-line bg-surface px-3 text-lg" />
        </label>
        <p className="label mb-2 mt-6">Group</p>
        <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 7, 8].map(x => <button key={x} className={chip(g === x)} onClick={() => { setG(x); setSec(0) }}>{x}</button>)}</div>
        {g > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="label mb-2 mt-6">Section</p>
            <div className="flex gap-2">{secsOf(g).map(x => <button key={x} className={chip(sec === x)} onClick={() => setSec(x)}>{x}</button>)}</div>
          </motion.div>
        )}
        <Button variant="accent" className="mt-10 w-full" disabled={!name.trim() || !g || !sec} onClick={() => set({ name: name.trim(), group: g, section: sec })}>Open my week</Button>
        <p className="label mt-4">You can change these later in Settings. Nothing leaves your device.</p>
      </div>
    </motion.div>
  )
}
