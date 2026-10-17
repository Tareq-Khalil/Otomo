/** romaji in the accent colour, then the English meaning, then a small Japanese line */
export const Tri = ({ r, en, jp }: { r: string; en: string; jp: string }) => (
  <><span className="text-accent">{r}</span> · {en} <span className="jp">{jp}</span></>
)
