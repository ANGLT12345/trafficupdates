# LTA Traffic Incidents App

A full-stack application that records Singapore LTA Datamall traffic incidents into Supabase every minute and displays them in a filterable dashboard with Excel export.

## Architecture

```
trafficupdates/
├── supabase/
│   └── schema.sql          ← Run once in Supabase SQL Editor
├── lta-fetcher/            ← Node.js background worker (cron)
│   ├── index.js
│   ├── package.json
│   └── .env.example
└── lta-dashboard/          ← React + Vite frontend
    ├── src/
    │   └── App.tsx
    ├── package.json
    └── .env.example
```

---

## Phase 1 — Supabase Setup

1. Open your [Supabase](https://supabase.com) project → **SQL Editor**
2. Copy and run the contents of `supabase/schema.sql`
3. Go to **Project Settings → API** and note down:
   - **Project URL** (`https://xxx.supabase.co`)
   - **anon/public key** (for the frontend)
   - **service_role key** (for the backend worker — keep this secret)

---

## Phase 2 — Backend Worker

The worker fetches LTA Datamall every 60 seconds and upserts new incidents to Supabase (duplicates are automatically ignored via the `UNIQUE` constraint on `message`).

```bash
cd lta-fetcher
cp .env.example .env
# Edit .env and fill in your keys
npm install
node index.js
```

> **Production hosting:** Deploy `lta-fetcher/` to [Render](https://render.com), [Railway](https://railway.app), or any always-on Node host as a background worker.

---

## Phase 3 — Frontend Dashboard

```bash
cd lta-dashboard
cp .env.example .env
# Edit .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Features
- Filter by **incident type**, **date range**
- Sort by type or recorded time
- Paginated table (25 per page)
- **Download as .XLSX** (currently filtered view)
- Live stats: total count, most common type, date range

---

## Environment Variables

### `lta-fetcher/.env`
| Variable | Description |
|---|---|
| `LTA_API_KEY` | Your LTA Datamall API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS for inserts) |

### `lta-dashboard/.env`
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (safe to expose in frontend) |
