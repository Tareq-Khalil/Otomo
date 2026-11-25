import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { CalendarDays, CheckSquare, Home as HomeIcon, Settings as Cog, Timer, Users, Sparkles } from 'lucide-react'
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
import { Sakura } from '@/components/Sakura'
import { startSync, useSync } from '@/lib/sync'
import { useReminders } from '@/lib/reminders'
import { ReminderToasts } from '@/components/ReminderToasts'
import { UpdateBanner } from '@/components/UpdateBanner'
import { WhatsNew } from '@/components/WhatsNew'
import { JapanesePractice } from '@/components/JapanesePractice'
import { SyncConfirmDialog } from '@/components/SyncConfirmDialog'
import { initConfig } from '@/lib/otomo/config'

// Lazy load heavy AI and developer modules so Home and core timetable load instantly
const Companion = lazy(() => import('@/views/Companion').then(m => ({ default: m.Companion })))
const Studio = lazy(() => import('@/views/Studio').then(m => ({ default: m.Studio })))

const TABS = [
  { id: 'home', label: 'Home', kanji: '家', Icon: HomeIcon },
  { id: 'companion', label: 'Otomo', kanji: '供', Icon: Sparkles },
  { id: 'schedule', label: 'Week', kanji: '週', Icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', kanji: '課', Icon: CheckSquare },
  { id: 'study', label: 'Focus', kanji: '集', Icon: Timer },
  { id: 'others', label: 'Others', kanji: '皆', Icon: Users },
  { id: 'settings', label: 'You', kanji: '我', Icon: Cog }
] as const
export type View = (typeof TABS)[number]['id'] | 'studio'


function useData() {
  const [d, setD] = useState<Data | null>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('uh:data') ?? 'null')
      return isData(cached) ? cached : null
    } catch {
      return null
    }
  })
  const [failed, setFailed] = useState(false)
  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}data.json`,
        { cache: 'no-cache' }
      )
      if (!response.ok) {
        throw new Error(`Timetable request failed: HTTP ${response.status}`)
      }
      const json: unknown = await response.json()
      if (!isData(json)) {
        throw new Error('The timetable response has an invalid structure')
      }
      setD(json)
      setFailed(false)
      try {
        localStorage.setItem('uh:data', JSON.stringify(json))
      } catch {
      }
    } catch (error) {
      console.error('Could not refresh timetable:', error)
      setFailed(true)
    }
  }, [])
  useEffect(() => {
    void load()
    const handleOnline = () => {
      void load()
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [load])
  return { d, failed }
}


export default function App() {
  const [s, setS] = usePersisted<State>('uh:state', blank)
  const [view, setView] = useState<View>('home')
  const { d, failed } = useData()
  const set = (p: Partial<State>) => setS(o => ({ ...o, ...p }))

  useEffect(() => {
    startSync()
    void initConfig().catch(error => {
      console.error('Could not load Otomo configuration:', error)
    })
  }, [])
  const sync = useSync()

  // When cloud profile loads for registered users, sync any missing local profile fields
  useEffect(() => {
    if (sync.signedIn && sync.profile) {
      setS(prev => {
        const p = sync.profile!
        const needsUpdate =
          (!prev.name && p.name) ||
          (!prev.username && p.username) ||
          (!prev.code && p.code) ||
          (!prev.faculty && p.faculty) ||
          (!prev.level && p.level)
        if (!needsUpdate) return prev
        return {
          ...prev,
          name: prev.name || p.name || prev.name,
          username: prev.username || p.username || prev.username,
          faculty: prev.faculty || p.faculty || 'foe',
          level: prev.level || p.level || 1,
          code: prev.code || p.code || '',
          group: prev.group || p.group_no || 1,
          section: prev.section || p.section_no || 1
        }
      })
    }
  }, [sync.signedIn, sync.profile, setS])

  const rem = useReminders()
  useEffect(() => {
    document.documentElement.dataset.theme = s.theme
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', s.theme === 'dark' ? '#0a0a0b' : '#faf7f5')
  }, [s.theme])

  // Support URL hash routing (#developer, #companion, etc.)
  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash === 'developer' || window.location.pathname.includes('/developer')) {
        setView('studio')
      } else if (['home', 'companion', 'schedule', 'tasks', 'study', 'others', 'settings'].includes(hash)) {
        setView(hash as View)
      }
    }
    handleRoute()
    window.addEventListener('hashchange', handleRoute)
    return () => window.removeEventListener('hashchange', handleRoute)
  }, [])

  const ctx = useMemo(() => (d ? { s, set, data: d } : null), [s, d]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx) return <div className="grid h-full place-items-center p-8 text-center"><p className="label">{failed ? 'Could not load the timetable. Check your connection.' : 'Loading…'}</p></div>
  const onboarded = s.name && s.group && s.section

  const page = {
    home: <Home go={setView} />,
    companion: <Companion />,
    schedule: <Schedule go={setView} />,
    tasks: <Tasks />,
    study: <Study />,
    others: <Others />,
    settings: <Settings onOpenStudio={() => setView('studio')} />,
    studio: <Studio onBack={() => setView('settings')} />
  }[view]
  return (
    <AppCtx.Provider value={ctx}>
      <Sakura />
      <div className="h-full md:pl-60">
        <div className="mx-auto flex h-full max-w-xl flex-col md:max-w-5xl">
          <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-32 pt-[calc(1.5rem+env(safe-area-inset-top))] md:px-8 md:pb-10 md:pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={view === 'companion' ? 'h-full min-h-0' : undefined}
              >
                <Suspense fallback={<div className="grid h-full place-items-center p-8 text-center"><p className="label">Loading...</p></div>}>
                  {page}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        {/* phones: floating dock at the bottom · desktop: a side rail with kanji */}
        <nav aria-label="Main" className="dock fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md md:inset-x-auto md:inset-y-4 md:bottom-4 md:left-4 md:mx-0 md:flex md:w-52 md:max-w-none md:flex-col md:rounded-3xl md:p-3">
          <div className="mb-3 hidden items-center gap-3 px-1 pt-1 md:flex">
            <span className="seal">供</span>
            <span><b className="block font-display text-xl italic leading-none">Otomo</b><span className="jp text-xs">お供 · companion</span></span>
          </div>
          <LayoutGroup>
            <ul className="flex md:flex-col md:gap-1">
              {TABS.map(({ id, label, kanji, Icon }) => (
                <li key={id} className="relative flex-1 md:flex-none">
                  <button onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}
                    className={`relative z-10 flex w-full flex-col items-center gap-1 py-2.5 transition-colors md:flex-row md:gap-3 md:px-3 md:py-3 ${view === id ? 'text-white' : 'text-mute'}`}>
                    <Icon size={19} strokeWidth={1.7} className="md:hidden" />
                    <span aria-hidden className="hidden w-6 font-display text-xl md:inline-block">{kanji}</span>
                    <span className="label !text-[9px] !tracking-wider !text-current md:!text-xs">{label}</span>
                  </button>
                  {view === id && <motion.span layoutId="tab" className="absolute inset-1 rounded-full bg-accent md:inset-0 md:rounded-xl" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                </li>
              ))}
            </ul>
          </LayoutGroup>
        </nav>
        {!onboarded && <Onboarding />}
        {onboarded && <InstallBanner />}
        {onboarded && <JapanesePractice />}
        <ReminderToasts items={rem.items} dismiss={rem.dismiss} go={setView} />
        <SyncConfirmDialog />
        <UpdateBanner />
        {onboarded && <WhatsNew />}
      </div>
    </AppCtx.Provider>
  )
}
