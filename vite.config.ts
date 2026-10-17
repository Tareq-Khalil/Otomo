import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: './', name: 'Otomo — E-JUST schedule & focus', short_name: 'Otomo', description: 'Timetable, tasks and focus timer for E-JUST students', lang: 'en', categories: ['education','productivity'],
        shortcuts: [{ name: 'Tasks', url: './#tasks' }, { name: 'Focus', url: './#study' }, { name: 'Week', url: './#schedule' }],
        start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
        background_color: '#0a0a0b', theme_color: '#0a0a0b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png}'],
        // timetable data: network first so changes show up, saved copy when offline
        
runtimeCaching: [
  {
    urlPattern: ({ url }) =>
      url.origin === self.location.origin &&
      url.pathname.endsWith('/data.json'),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'uni-data-v2',
      networkTimeoutSeconds: 10,
      expiration: {
        maxEntries: 1,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        purgeOnQuotaError: true
      },
      cacheableResponse: {
        statuses: [200]
      }
    }
  }
]

      }
    })
  ]
})
