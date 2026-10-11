import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { isInApp, isIOS, useInstall } from '@/lib/install'

export function InstallBanner() {
  const { show, canPrompt, install, dismiss } = useInstall()
  const [guide, setGuide] = useState(false)

  const go = async () => {
    if (canPrompt && !isInApp) { if (await install()) dismiss() }
    else setGuide(true)
  }

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-3 top-[calc(.75rem+env(safe-area-inset-top))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl bg-ink p-2 pl-4 text-bg shadow-xl"
          >
            <button onClick={go} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Download size={20} className="shrink-0 text-accent" />
              <span className="min-w-0">
                <b className="block text-[15px]">Install Uni Hub</b>
                <span className="block text-xs opacity-60">Add it to your home screen</span>
              </span>
            </button>
            <button onClick={dismiss} aria-label="Close" className="grid h-10 w-10 place-items-center opacity-60"><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={guide} onOpenChange={setGuide} title="Install Uni Hub">
        <ol className="list-decimal space-y-2 pl-5 text-[15px]">
          {isInApp ? (
            <>
              <li>This in-app browser can't install apps.</li>
              <li>Tap the <b>⋯</b> or <b>⋮</b> menu in the corner.</li>
              <li>Choose <b>Open in browser</b> (Chrome or Safari), then tap Install again.</li>
            </>
          ) : isIOS ? (
            <>
              <li>In <b>Safari</b>, tap the <b>Share</b> button (square with an arrow).</li>
              <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
              <li>Tap <b>Add</b>.</li>
            </>
          ) : (
            <>
              <li>Open the browser menu <b>⋮</b>.</li>
              <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
              <li>Confirm.</li>
            </>
          )}
        </ol>
        <Button className="mt-5 w-full" onClick={() => setGuide(false)}>Got it</Button>
      </Sheet>
    </>
  )
}