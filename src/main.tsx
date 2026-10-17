import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import './lib/install'
import { markWaiting, setUpdater } from './lib/update'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: markWaiting,
  onRegisteredSW: (_url, r) => { if (r) setInterval(() => r.update().catch(() => undefined), 3_600_000) }
})
setUpdater(() => updateSW(true))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>
)
