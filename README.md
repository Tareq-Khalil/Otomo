# Otomo (お供) · v3.0.0

A local-first academic companion, timetable, exam hall locator, offline task manager, and focus timer designed for E-JUST (Egypt-Japan University of Science and Technology) students.

Built with **React 19**, **Vite 6**, **TypeScript**, **Tailwind CSS v4**, **Motion**, and **Vite PWA (Workbox)** with a Japanese anime aesthetic. Supports English, 日本語, and Rōmaji.

```bash
npm install && npm run dev
npm run build
```

Deployed on Vercel. Set `VITE_SITE_URL` to match your production domain. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable cloud synchronization.

---

## What's New in Major Update 3 (v3.0.0)

### 1. FoE Level 1 Midterm Examination Schedule & Room Locator
- **Official Exam Schedule**: Full integration of the FoE Grade 1 midterm schedule:
  - Sun 08/11/2026: **MTH-111** Mathematics (1) (09:00 – 10:15)
  - Mon 09/11/2026: **PHY-111** Physics (1) (09:00 – 10:15)
  - Tue 10/11/2026: **MTR-111** Mechanics (Statics + Dynamics) (09:00 – 10:15)
  - Wed 11/11/2026: **CHM-111** Chemistry (1) (09:00 – 10:15)
  - Thu 12/11/2026: **IME-111** Engineering Drawings (09:00 – 10:15)
- **Personalized Exam Hall Allocation**: The application dynamically determines the student's exact exam room in **Building 18** (e.g. `G:08`, `G:09`, `F1:01`, `F1:05`, `F1:10`, `F1:19`, `F1:14`, `G:13`) based on their numeric student ID code range.
- **Midterm Week Adaptation**: During exam week, regular lectures and labs are automatically suppressed, displaying only the relevant midterm exam and personal study events.
- **Cached Offline**: Exam distributions are stored in `public/exams-foe-l1.json` with Workbox `NetworkFirst` runtime caching for reliable offline availability.

### 2. Hybrid Account System & Local Guest Mode
- **Guest-First (No Mandatory Sign-up)**: Users can use 100% of the app's features (academic timetable, exam hall lookup, tasks, personal events, focus timer) offline without ever creating an account.
- **Optional Cloud Accounts**: Users can register an account at any time for cross-device cloud synchronization and backup.
- **Complete Profile Schema**: Supports full academic profile info (`name`, `username`, `email`, `faculty`, `level`, `group_no`, `section_no`, `code`).
- **Seamless Guest-to-Account Conversion**: Local tasks and events created in guest mode are safely transferred to the registered account upon sign-in (`claimLocal` and `claimLocalEvents`) without data loss or duplication.
- **Compatibility for Existing Users**: Existing accounts are preserved. Users can update their name, student code, and academic data at any time via the new "Change My Data" button on their Student Pass.

### 3. Personal Events in IndexedDB with Cloud Sync
- Personal events moved from `localStorage` to **IndexedDB** (`src/lib/events.ts`).
- Automatic backward-compatible migration of legacy `s.mine` events on first startup.
- Multi-device synchronization with optimistic concurrency versioning, outbox retry queues, and soft-deletes (`supabase/migrations/0004_events.sql`).

### 4. Scalable Multi-Faculty Architecture
- Scalable configuration in `src/lib/faculties.ts` designed to support future faculties (FoS, CS, etc.) and upper academic levels without restructuring the application.
- Friendly, animated "Coming Soon" notifications for upcoming faculties and levels.

### 5. Japanese Anime Aesthetics & Animations
- **Welcoming Onboarding Wizard**: 5-step animated wizard featuring Otomo-chan, guiding users through faculty, level, academic profile, and optional account setup.
- **Interactive Anime Mascot Companion**: Chibi Otomo-chan widget on Home with contextual advice (exam day reminders, task counters) and reactive manga sound-effect stickers on tap (`*ファイト！*`, `*キラキラ*`, `*よしっ！*`).
- **Anime Study Mascot**: Otomo-chan joins the Focus timer wearing a "必勝" (Certain Victory) headband during study sessions, and sips green tea during breaks.
- **Anime Student Pass**: Digital Japanese student ID card on the You page with official red Hanko stamp (`認`), barcode, and an instant "Change My Data" button.
- **Enhanced Transitions**: Spring-based scaling page transitions, subtle floating animations, and Canvas-rendered falling cherry blossoms (`Sakura.tsx`).

---

## Database Migrations (Supabase)

To enable cloud synchronization for v3, run the SQL migrations in order in your Supabase SQL Editor:

1. `supabase/migrations/0001_tasks.sql` — Tasks table, triggers, and Row Level Security.
2. `supabase/migrations/0002_task_reminders.sql` — Task reminder minutes support.
3. `supabase/migrations/0003_profiles.sql` — User profiles (name, username, faculty, level, group, section, student code) with user-level RLS.
4. `supabase/migrations/0004_events.sql` — Personal events table with versioning and soft-delete sync.

---

## Version History

- **v3.0.0 (Major Update 3)**: FoE Level 1 Midterm exam schedule integration with Building 18 room locator, hybrid guest/cloud account system, personal events IndexedDB sync, anime mascot companion & student pass, and multi-step onboarding.
- **v2.0.0**: Local-first tasks in IndexedDB, three-way merge conflict resolution, outbox sync engine with Supabase, PWA update prompt, and new dark/light palette.
- **v1.0.0**: Initial release featuring E-JUST timetable viewer, Pomodoro focus timer, section explorer, and multi-language support (English, Japanese, Rōmaji).
