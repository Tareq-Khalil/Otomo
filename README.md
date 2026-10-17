# Otomo (お供)
Timetable, tasks and focus timer for E-JUST students. React 19 · Vite · TypeScript · Tailwind v4 · Motion · PWA. Languages: English, 日本語, Rōmaji.

    npm install && npm run dev
    npm run build

Deployed on Vercel. Set `VITE_SITE_URL` (in `.env` and Vercel env vars) to your real address so canonical/OG/sitemap match.
Update timetables by editing `public/data.json`. Edit `public/sitemap.xml` and `public/robots.txt` if the address changes.

## Offline-first tasks and sync (v2)
- Tasks live in **IndexedDB** (`src/lib/db.ts`, `tasks.ts`); the UI reads only from there, so it works offline and survives restarts and app updates. The database only ever gains stores, never loses them.
- Edits are queued in an **outbox** (one coalesced pending upload per task, `status: pending | failed | conflict`) and uploaded by `src/lib/sync.ts` when the app opens, comes back online, becomes visible, every 60 s, after an edit, or when you press Retry. Failures back off (2 s doubling to 5 min) and stay queued; nothing is discarded silently.
- Uploads are idempotent: task ids are UUIDs made on the device, creates use `ignore-duplicates`, updates are conditional on the server `version`.
- Conflicts are merged field by field against the last server copy; if both sides changed the same field, the task shows "Keep mine / Use the other".
- Account isolation: each task stores its `owner`. Tasks made while signed out are `local` and are offered to the account on sign-in. Signing out warns about unsynced changes, which stay on the device and only ever upload to their own account.
- Sync is **off** until you set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) and run `supabase/migrations/0001_tasks.sql`. Without them the app is fully usable and local-only.
- Not done: background sync while the app is closed (foreground sync only), push/OS reminders, and Daily Mission Control entries inside the Week timeline.
