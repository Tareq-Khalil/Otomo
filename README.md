# Otomo v1

React 19 · Vite · TypeScript (strict) · Tailwind v4 · Motion · Radix Dialog (shadcn-style components) · vite-plugin-pwa

    npm install
    npm run dev        # http://localhost:5173
    npm run build      # typecheck + production build into dist/

Deploy `dist/` to Cloudflare Pages: `public/_headers` ships the Content-Security-Policy.
Update timetables by editing `public/data.json`; its shape is validated at load.
