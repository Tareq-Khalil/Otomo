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
  onRegisteredSW: (_url, registration) => {
    if (!registration) return
    const checkForUpdate = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        void registration.update().catch(() => undefined)
      }
    }
    void checkForUpdate()
    setInterval(checkForUpdate, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', checkForUpdate)
  },
  onRegisterError: error => {
    console.error('Could not register the Otomo service worker:', error)
  }
})
setUpdater(() => updateSW(true))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>
)
