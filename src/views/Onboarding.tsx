import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, User, Lock, Mail, AtSign, School, CheckCircle2, Stethoscope, GraduationCap, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OtomoCharacter } from '@/components/OtomoCharacter'
import { useApp } from '@/lib/store'
import { FACULTIES, getFaculty, getGroups, getSections, isSupported } from '@/lib/faculties'
import { configured, signIn, signUp } from '@/lib/sync'
import { cn } from '@/lib/utils'

export function Onboarding() {
  const { set } = useApp()

  const [hasStarted, setHasStarted] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginMsg, setLoginMsg] = useState('')

  // Wizard step: 0 = Role, 1 = Faculty, 2 = Level, 3 = Profile, 4 = Optional Account
  const [step, setStep] = useState<number>(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [selectedRole, setSelectedRole] = useState<'student' | 'ta' | 'doctor' | null>(null)
  const [roleNotice, setRoleNotice] = useState('')

  // Academic & personal state
  const [faculty, setFaculty] = useState<string>('foe')
  const [facultyNotice, setFacultyNotice] = useState('')
  const [level, setLevel] = useState<number>(1)
  const [name, setName] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [group, setGroup] = useState<number>(1)
  const [section, setSection] = useState<number>(1)

  // Optional Account state
  const [createAcc, setCreateAcc] = useState<boolean>(false)
  const [username, setUsername] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [busy, setBusy] = useState<boolean>(false)
  const [authMsg, setAuthMsg] = useState<string>('')

  const selectedFac = getFaculty(faculty)
  const availableGroups = getGroups(faculty)
  const availableSections = getSections(faculty, group)

  const goTo = (nextStep: number) => {
    setDir(nextStep > step ? 1 : -1)
    setStep(nextStep)
  }

  // Finalize as guest or after account creation
  const finishOnboarding = () => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    set({
      faculty,
      level,
      name: name.trim(),
      username: cleanUsername || `user_${code.slice(-4) || 'ejust'}`,
      code: code.trim(),
      group,
      section
    })
  }

  const handleRegisterAndFinish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createAcc) {
      finishOnboarding()
      return
    }

    setBusy(true)
    setAuthMsg('')

    const err = await signUp(email.trim(), password, {
      name: name.trim(),
      username: username.trim(),
      faculty,
      level,
      group_no: group,
      section_no: section,
      code: code.trim()
    })

    setBusy(false)
    if (err) {
      setAuthMsg(err)
      return
    }

    finishOnboarding()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginBusy(true)
    setLoginMsg('')
    const error = await signIn(loginEmail.trim(), loginPassword)
    setLoginBusy(false)
    if (error) {
      setLoginMsg(error)
      return
    }
    setLoginPassword('')
  }

  const stepVariants = {
    enter: (d: number) => ({ x: d > 0 ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -30 : 30, opacity: 0 })
  }

  if (!hasStarted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-bg px-6 py-[calc(2.5rem+env(safe-area-inset-top))]"
      >
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6">
          <div className="mb-8 flex items-center justify-center gap-2">
            <span className="seal w-8 h-8 text-sm">供</span>
            <span className="font-display text-lg font-medium tracking-tight">Otomo</span>
          </div>

          <section aria-labelledby="account-entry-title" className="space-y-5">
            <div className="text-center">
              <OtomoCharacter mood="welcome" size="sm" showBadge={false} className="mx-auto mb-2" />
              <h1 id="account-entry-title" className="font-display text-3xl font-light italic">
                Welcome to Otomo.
              </h1>
              <p className="mt-1 text-sm text-mute">
                Sign in to your account, or continue with setup.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div>
                <label htmlFor="onboarding-login-email" className="label block mb-1">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-3.5 text-mute" />
                  <input
                    id="onboarding-login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={event => setLoginEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-base text-ink placeholder:text-mute/60 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="onboarding-login-password" className="label block mb-1">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-3.5 text-mute" />
                  <input
                    id="onboarding-login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={event => setLoginPassword(event.target.value)}
                    placeholder="Your password"
                    className="h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-base text-ink placeholder:text-mute/60 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {loginMsg && (
                <p role="alert" className="rounded-lg border border-accent/20 bg-accent/10 p-2.5 text-xs text-ink">
                  {loginMsg}
                </p>
              )}
              {!configured && (
                <p className="text-xs leading-relaxed text-mute">
                  Cloud sign-in is unavailable in this build. You can continue with setup and use Otomo offline.
                </p>
              )}

              <Button
                type="submit"
                variant="accent"
                className="h-11 w-full"
                disabled={!configured || loginBusy || !loginEmail.trim() || !loginPassword}
              >
                <LogIn size={16} className="mr-1.5" />
                {loginBusy ? 'Signing in…' : 'Log in'}
              </Button>
            </form>

            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              <span className="label text-[9px]">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <Button
              type="button"
              variant="line"
              className="h-11 w-full"
              onClick={() => setHasStarted(true)}
            >
              Continue with setup <ArrowRight size={16} className="ml-1.5" />
            </Button>
            <p className="label text-center text-[10px]">
              You can create an optional cloud account later in setup.
            </p>
          </section>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-bg px-6 py-[calc(2.5rem+env(safe-area-inset-top))] flex flex-col justify-between"
    >
      <div className="mx-auto w-full max-w-lg flex-1 flex flex-col justify-center py-6">
        {/* Progress indicator */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="seal w-8 h-8 text-sm">供</span>
            <span className="font-display font-medium text-lg tracking-tight">Otomo</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map(i => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  step === i
                    ? 'w-6 bg-accent'
                    : i < step
                    ? 'w-2 bg-accent/40'
                    : 'w-2 bg-line'
                )}
              />
            ))}
          </div>
        </div>

        {/* Wizard Step Content */}
        <div className="relative min-h-[380px]">
          <AnimatePresence custom={dir} mode="wait">
            {/* STEP 0: Role Selection */}
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <div className="flex items-center gap-4">
                  <OtomoCharacter mood="welcome" size="sm" showBadge={false} />
                  <div>
                    <h1 className="font-display text-3xl font-light italic leading-tight">
                      Welcome to Otomo.
                    </h1>
                    <p className="mt-1 text-sm text-mute">
                      First, tell me how you use E-JUST.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  {[
                    { id: 'student', label: 'Student', description: 'Study tools, timetable, and Otomo', Icon: GraduationCap },
                    { id: 'ta', label: 'Teaching Assistant', description: 'Tools for E-JUST teaching assistants', Icon: User },
                    { id: 'doctor', label: 'Doctor', description: 'Tools for E-JUST faculty members', Icon: Stethoscope }
                  ].map(({ id, label, description, Icon }) => {
                    const active = selectedRole === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedRole(id as 'student' | 'ta' | 'doctor')
                          if (id === 'student') {
                            setRoleNotice('')
                            goTo(1)
                          } else {
                            setRoleNotice(`${label} access isn't available yet. It will arrive in a future update.`)
                          }
                        }}
                        className={cn(
                          'flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors',
                          active ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-accent/50'
                        )}
                      >
                        <span className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
                          active ? 'border-accent/40 bg-accent text-white' : 'border-line bg-bg text-mute'
                        )}>
                          <Icon size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-ink">{label}</span>
                          <span className="block text-xs text-mute">{description}</span>
                        </span>
                        {id === 'student'
                          ? <ArrowRight size={16} className="shrink-0 text-accent" />
                          : <span className="label shrink-0 text-[9px]">Coming soon</span>}
                      </button>
                    )
                  })}
                </div>
                {roleNotice && (
                  <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-ink">
                    {roleNotice}
                  </p>
                )}
                <p className="label text-center text-[10px]">No account required to begin.</p>
              </motion.div>
            )}

            {/* STEP 1: Faculty Selection */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <div>
                  <button
                    onClick={() => goTo(0)}
                    className="label flex items-center gap-1 mb-2 text-mute hover:text-ink transition-colors"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <h2 className="font-display text-3xl font-light italic">Select your faculty</h2>
                  <p className="jp text-xs text-mute mt-1">学部を選択してください</p>
                </div>

                <div className="space-y-2.5">
                  {FACULTIES.map(f => {
                    const active = faculty === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (!f.supported) {
                            setFacultyNotice(`${f.name} isn't available yet. It will be added in a future update.`)
                            return
                          }
                          setFaculty(f.id)
                          setFacultyNotice('')
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors',
                          active
                            ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-sm'
                            : f.supported
                              ? 'border-line bg-surface hover:border-line/80'
                              : 'border-line bg-surface/60 text-mute hover:border-gold/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'grid h-10 w-10 place-items-center rounded-xl border',
                            active ? 'border-accent/40 bg-accent text-white' : 'border-line bg-bg text-mute'
                          )}>
                            <School size={20} />
                          </div>
                          <div>
                            <span className="block font-medium text-base text-ink">{f.name}</span>
                            <span className="label text-[11px] text-mute">{f.shortName} · E-JUST</span>
                          </div>
                        </div>
                        {active
                          ? <CheckCircle2 size={20} className="text-accent" />
                          : <span className="label text-[9px]">{f.supported ? 'Available' : 'Coming soon'}</span>}
                      </button>
                    )
                  })}
                </div>

                {facultyNotice ? (
                  <p role="status" className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-ink">
                    {facultyNotice}
                  </p>
                ) : (
                  <Button
                    variant="accent"
                    className="mt-2 h-11 w-full"
                    onClick={() => goTo(2)}
                  >
                    Continue to Academic Level <ArrowRight size={16} className="ml-1.5" />
                  </Button>
                )}
              </motion.div>
            )}

            {/* STEP 2: Level Selection */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <div>
                  <button
                    onClick={() => goTo(1)}
                    className="label flex items-center gap-1 mb-2 text-mute hover:text-ink transition-colors"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <h2 className="font-display text-3xl font-light italic">Choose your level</h2>
                  <p className="jp text-xs text-mute mt-1">学年を選択してください</p>
                </div>

                {selectedFac && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedFac.levels.map(l => {
                      const active = level === l.level
                      return (
                        <button
                          key={l.level}
                          type="button"
                          onClick={() => setLevel(l.level)}
                          className={cn(
                            'relative rounded-2xl border p-4 text-left transition-all',
                            active
                              ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-sm'
                              : 'border-line bg-surface hover:border-line/80'
                          )}
                        >
                          <span className="block font-display text-2xl font-light">{l.label}</span>
                          <span className="label text-[10px] mt-1 block">
                            {l.supported ? 'Available' : 'Coming soon'}
                          </span>
                          {active && (
                            <span className="absolute top-3 right-3 text-accent">
                              <Check size={18} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Friendly Coming Soon Screen if user selects an unsupported level */}
                {!isSupported(faculty, level) ? (
                  <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-center space-y-2">
                    <p className="text-sm font-medium text-ink">
                      Level {level} is arriving soon.
                    </p>
                    <p className="text-xs text-mute leading-relaxed">
                      Course data, midterm room distributions, and timetables for Level {level} are currently in development.
                      Please select <b>Level 1</b> to access the current live release.
                    </p>
                  </div>
                ) : (
                  <div className="pt-4">
                    <Button
                      variant="accent"
                      className="w-full h-11"
                      onClick={() => goTo(3)}
                    >
                      Continue to Profile <ArrowRight size={16} className="ml-1.5" />
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Profile Setup (Name, Code, Group, Section) */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div>
                  <button
                    onClick={() => goTo(2)}
                    className="label flex items-center gap-1 mb-2 text-mute hover:text-ink transition-colors"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <h2 className="font-display text-3xl font-light italic">Your information</h2>
                  <p className="jp text-xs text-mute mt-1">基本情報を入力してください</p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="label block mb-1">Full Name</label>
                      <input
                        type="text"
                        maxLength={24}
                        value={name}
                        placeholder="e.g. Tareq Khalil"
                        onChange={e => setName(e.target.value)}
                        className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-mute/40 focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="label block mb-1">Username (@handle)</label>
                      <input
                        type="text"
                        maxLength={24}
                        value={username}
                        placeholder="e.g. tareq_k"
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm font-mono text-ink placeholder:text-mute/40 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label block mb-1">
                      Student Code (Academic ID)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={code}
                      placeholder="e.g. 120260123"
                      onChange={e => setCode(e.target.value.replace(/\s+/g, ''))}
                      className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-base font-mono text-ink placeholder:text-mute/40 focus:border-accent focus:outline-none"
                    />
                    <p className="text-[10px] text-mute mt-1">
                      Used to match your midterm examination room in Building 18.
                    </p>
                  </div>

                  <div>
                    <label className="label block mb-1.5">Group</label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableGroups.map(x => (
                        <button
                          key={x}
                          type="button"
                          onClick={() => {
                            setGroup(x)
                            const nextSecs = getSections(faculty, x)
                            if (nextSecs.length) setSection(nextSecs[0])
                          }}
                          className={cn(
                            'h-10 w-10 rounded-full border font-mono text-sm transition-all',
                            group === x
                              ? 'border-accent bg-accent text-white shadow-sm'
                              : 'border-line bg-surface hover:border-line/80 text-ink'
                          )}
                        >
                          {x}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label block mb-1.5">Section</label>
                    <div className="flex flex-wrap gap-2">
                      {availableSections.map(x => (
                        <button
                          key={x}
                          type="button"
                          onClick={() => setSection(x)}
                          className={cn(
                            'h-10 px-4 rounded-xl border font-mono text-sm transition-all',
                            section === x
                              ? 'border-accent bg-accent text-white shadow-sm'
                              : 'border-line bg-surface hover:border-line/80 text-ink'
                          )}
                        >
                          Section {x}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="accent"
                    className="w-full h-11"
                    disabled={!name.trim() || code.trim().length < 6}
                    onClick={() => goTo(4)}
                  >
                    Next: Account &amp; Sync <ArrowRight size={16} className="ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Optional Account or Continue as Guest */}
            {step === 4 && (
              <motion.div
                key="step-4"
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div>
                  <button
                    onClick={() => goTo(3)}
                    className="label flex items-center gap-1 mb-2 text-mute hover:text-ink transition-colors"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <h2 className="font-display text-3xl font-light italic">Sync &amp; Backup</h2>
                  <p className="jp text-xs text-mute mt-1">クラウド同期（任意）</p>
                </div>

                <p className="text-xs text-mute leading-relaxed">
                  Otomo operates 100% offline in <b>Guest Mode</b>. Creating an account is completely optional and enables cross-device cloud backup.
                </p>

                <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block font-medium text-sm text-ink">Create a Cloud Account</span>
                      <span className="text-[11px] text-mute">Multi-device sync &amp; safe recovery</span>
                    </div>
                    <input
                      type="checkbox"
                      id="createAccToggle"
                      checked={createAcc}
                      onChange={e => setCreateAcc(e.target.checked)}
                      className="h-5 w-5 accent-accent rounded"
                    />
                  </div>

                  {createAcc && (
                    <form onSubmit={handleRegisterAndFinish} className="space-y-3 pt-2 border-t border-line">
                      <div>
                        <label className="label block mb-1">Username</label>
                        <div className="relative">
                          <AtSign size={15} className="absolute left-3 top-3.5 text-mute" />
                          <input
                            type="text"
                            required
                            placeholder="username"
                            minLength={3}
                            maxLength={30}
                            value={username}
                            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            className="h-10 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm font-mono text-ink focus:border-accent focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label block mb-1">Email</label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3 top-3.5 text-mute" />
                          <input
                            type="email"
                            required
                            placeholder="you@ejust.edu.eg"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="h-10 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm text-ink focus:border-accent focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label block mb-1">Password</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3 top-3.5 text-mute" />
                          <input
                            type="password"
                            required
                            minLength={8}
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="h-10 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm text-ink focus:border-accent focus:outline-none"
                          />
                        </div>
                      </div>

                      {authMsg && (
                        <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg p-2.5">
                          {authMsg}
                        </p>
                      )}

                      <Button
                        type="submit"
                        variant="accent"
                        className="w-full h-11 mt-2"
                        disabled={busy || !username || !email || password.length < 8}
                      >
                        {busy ? 'Creating Account...' : 'Complete & Open Otomo'}
                      </Button>
                    </form>
                  )}
                </div>

                {!createAcc && (
                  <div className="pt-2 space-y-2">
                    <Button
                      variant="accent"
                      className="w-full h-11"
                      onClick={finishOnboarding}
                    >
                      Continue as Guest (Instant Access)
                    </Button>
                    <p className="label text-center text-[10px]">
                      You can register an account at any time in Settings.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
