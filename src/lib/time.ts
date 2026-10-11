export const mins = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m }
export const clock = (t: string) => { const [h, m] = t.split(':'); return `${+h % 12 || 12}:${m} ${+h < 12 ? 'AM' : 'PM'}` }
export const p2 = (n: number) => String(n).padStart(2, '0')
export const hm = (m: number) => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`
export const dur = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r} min` }
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const weekStart = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); s.setDate(s.getDate() - ((s.getDay() + 1) % 7)); return s }
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const secsOf = (g: number) => [1, 2, 3].map(i => (g - 1) * 3 + i)
export const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
