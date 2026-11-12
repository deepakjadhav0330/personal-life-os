# Personal Life OS

A private, offline-first Personal Life Management PWA. All data lives locally on your device — nothing is ever sent to any server.

## Modules

- **Dashboard** — Daily overview with live widgets
- **Tasks** — Full task management with priorities, recurrence, overdue tracking
- **Habits** — Daily habit tracking with streaks and contribution calendar
- **Fitness** — Body measurements, workout tracker, nutrition logging, analytics
- **Finance** — Income/expense tracking, budgets, charts
- **Journal** — Private journaling with mood tracking and thought analysis
- **Goals** — Goal management with milestones and progress tracking
- **Calendar** — Monthly/agenda view, reminders

## Development

```bash
npm install
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build
npm run preview    # Preview production build
```

## Deployment (Cloudflare Pages)

1. Push this repository to GitHub
2. Go to pages.cloudflare.com → Create a project → Connect to Git
3. Build command: `npm run build`
4. Output directory: `dist`
5. Node.js version: 18

## Installing on iPhone

1. Open the deployed HTTPS URL in **Safari** on your iPhone
2. Tap the **Share** button (bottom of Safari)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right
5. Open "Life OS" from your Home Screen

## Privacy

All personal data is stored in IndexedDB (browser local storage) on your device only. The app files are served as static assets — no personal data ever touches the server. See Settings → Privacy Information for full details.

## Tech Stack

- React 18 + TypeScript + Vite 8
- Tailwind CSS 3 (custom Deep Space Glass design system)
- Dexie.js (IndexedDB)
- Zustand (state)
- Recharts (charts)
- Lucide React (icons)
- vite-plugin-pwa (service worker + manifest)
