import * as D from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

export function Sheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <D.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-t-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl border border-line bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <D.Title className="mb-4 font-display text-3xl italic">{title}</D.Title>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
