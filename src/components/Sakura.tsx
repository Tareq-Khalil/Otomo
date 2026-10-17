import { useEffect, useRef } from 'react'

/** drifting sakura petals on a canvas behind the app: no libraries, paused when the tab is hidden, off for reduced motion */
export function Sakura() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d')
    if (!x || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let w = 0, h = 0, raf = 0
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; c.width = w * d; c.height = h * d; x.setTransform(d, 0, 0, d, 0, 0) }
    size(); addEventListener('resize', size)
    const root = document.documentElement
    const read = () => getComputedStyle(root).getPropertyValue('--sakura').trim() || '#ff9ec4'
    let color = read()
    const mo = new MutationObserver(() => { color = read() }); mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    const ps = Array.from({ length: innerWidth < 640 ? 14 : 28 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 4 + Math.random() * 6, v: .3 + Math.random() * .8, s: Math.random() * 6.3, a: Math.random() * 6.3, ws: .01 + Math.random() * .02 }))
    const tick = () => {
      x.clearRect(0, 0, w, h); x.fillStyle = color; x.globalAlpha = .5
      for (const p of ps) {
        p.y += p.v; p.s += p.ws; p.a += .02; p.x += Math.sin(p.s) * .6 + .2
        if (p.y > h + 12) { p.y = -12; p.x = Math.random() * w }
        if (p.x > w + 12) p.x = -12
        x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.scale(1, .55 + .45 * Math.abs(Math.sin(p.a * .8)))
        x.beginPath(); x.ellipse(0, 0, p.r * .55, p.r, 0, 0, 6.283); x.fill(); x.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick) }
    vis(); document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(raf); mo.disconnect(); removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis) }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}
