import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { CalendarDays, CheckSquare, Home as HomeIcon, Settings as Cog, Timer, Users } from 'lucide-react'
import { AppCtx, blank, usePersisted } from '@/lib/store'
import { isData, type Data, type State } from '@/lib/types'
import { Home } from '@/views/Home'
import { Schedule } from '@/views/Schedule'
import { Others } from '@/views/Others'
import { Tasks } from '@/views/Tasks'
import { Study } from '@/views/Study'
import { Settings } from '@/views/Settings'
import { Onboarding } from '@/views/Onboarding'
import { InstallBanner } from '@/components/InstallBanner'

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'schedule', label: 'Week', Icon: CalendarDays },
  { id: 'others', label: 'Others', Icon: Users },
  { id: 'tasks', label: 'Tasks', Icon: CheckSquare },
  { id: 'study', label: 'Focus', Icon: Timer },
  { id: 'settings', label: 'You', Icon: Cog }
] as const
export type View = (typeof TABS)[number]['id']

function useData() {
  const [d, setD] = useState<Data | null>(() => {
    try { const c = JSON.parse(localStorage.getItem('uh:data') ?? 'null'); return isData(c) ? c : null } catch { return null }
  })
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`, { cache: 'no-cache' })
      .then(r => r.json()).then(j => {
        if (!isData(j)) throw new Error('bad data')
        setD(j); try { localStorage.setItem('uh:data', JSON.stringify(j)) } catch { /* full */ }
      }).catch(() => setFailed(true))
  }, [])
  return { d, failed }
}

export default function App() {
  const [s, setS] = usePersisted<State>('uh:state', blank)
  const [view, setView] = useState<View>('home')
  const { d, failed } = useData()
  const set = (p: Partial<State>) => setS(o => ({ ...o, ...p }))

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', s.theme === 'dark' ? '#0e0d0b' : '#ece6d8')
  }, [s.theme])

  const ctx = useMemo(() => (d ? { s, set, data: d } : null), [s, d]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx) return <div className="grid h-full place-items-center p-8 text-center"><p className="label">{failed ? 'Could not load the timetable. Check your connection.' : 'Loading…'}</p></div>
  const onboarded = s.name && s.group && s.section

  const page = { home: <Home go={setView} />, schedule: <Schedule />, others: <Others />, tasks: <Tasks />, study: <Study />, settings: <Settings /> }[view]
  return (
    <AppCtx.Provider value={ctx}>
      <div className="mx-auto flex h-full max-w-xl flex-col">
        <main className="flex-1 overflow-y-auto px-5 pb-28 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .22, ease: [.2, .8, .2, 1] }}>
              {page}
            </motion.div>
          </AnimatePresence>
        </main>
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
          <LayoutGroup>
            <ul className="flex">
              {TABS.map(({ id, label, Icon }) => (
                <li key={id} className="relative flex-1">
                  <button onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}
                    className={`flex w-full flex-col items-center gap-1 pb-2.5 pt-3 transition-colors ${view === id ? 'text-ink' : 'text-mute'}`}>
                    <Icon size={20} strokeWidth={1.7} /><span className="label !text-[9px] !text-current">{label}</span>
                  </button>
                  {view === id && <motion.span layoutId="tab" className="absolute inset-x-3 top-0 h-[3px] bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                </li>
              ))}
            </ul>
          </LayoutGroup>
        </nav>
        {!onboarded && <Onboarding />}
        {onboarded && <InstallBanner />}
      </div>
    </AppCtx.Provider>
  )
}
