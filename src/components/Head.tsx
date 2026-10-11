export function Head({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="mb-6">
      <p className="label">{kicker}</p>
      <h1 className="mt-1 font-display text-5xl font-light italic leading-[.95] tracking-tight">{title}</h1>
    </header>
  )
}
