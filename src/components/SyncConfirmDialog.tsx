import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { registerConfirmHandler } from '@/lib/sync'

interface PendingConfirm {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  resolve: (ok: boolean) => void
}

export function SyncConfirmDialog() {
  const [req, setReq] = useState<PendingConfirm | null>(null)

  useEffect(() => {
    return registerConfirmHandler(opts => new Promise<boolean>(resolve => {
      setReq({
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Continue',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        resolve
      })
    }))
  }, [])

  const finish = (ok: boolean) => {
    if (!req) return
    const { resolve } = req
    setReq(null)
    resolve(ok)
  }

  return (
    <Sheet open={!!req} onOpenChange={open => { if (!open) finish(false) }} title={req?.title ?? 'Confirm'}>
      {req && (
        <div className="space-y-4 pt-1">
          <p className="text-sm leading-relaxed text-ink/90">{req.message}</p>
          <div className="flex gap-2">
            <Button variant="line" className="flex-1" onClick={() => finish(false)}>
              {req.cancelLabel}
            </Button>
            <Button variant="accent" className="flex-1" onClick={() => finish(true)}>
              {req.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
