export function Head({ kicker, title, jp }: { kicker: string; title: string; jp?: string }) {
  return (
    <header className="relative mb-6">
      <span aria-hidden className="pointer-events-none absolute -top-2 right-0 select-none font-display text-6xl font-light text-gold opacity-25 [writing-mode:vertical-rl]">お供</span>
      <p className="label">{kicker}</p>
      <h1 className="mt-1 pr-12 font-display text-[clamp(2.5rem,7vw,3.75rem)] font-light italic leading-[.95] tracking-tight">{title}</h1>
      {jp && <p className="jp mt-1 text-sm">{jp}</p>}
      <i className="brush" aria-hidden />
    </header>
  )
}
