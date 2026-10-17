import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { applyUpdate, useUpdateReady } from '@/lib/update'

export function UpdateBanner() {
  const ready = useUpdateReady()
  const [later, setLater] = useState(false)
  if (!ready || later) return null
  return (
    <div role="status" className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-xl md:bottom-6 md:left-auto md:right-6 md:mx-0">
      <p className="min-w-0 flex-1 text-sm">A new version of Otomo is ready. Your tasks and unsent changes are kept.</p>
      <Button size="sm" variant="accent" onClick={() => applyUpdate()}>Update</Button>
      <Button size="sm" variant="ghost" onClick={() => setLater(true)}>Later</Button>
    </div>
  )
}
