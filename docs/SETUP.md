# DisciplineX — Final setup

Whole app is built. Follow these steps once and you're live.

## 1 · Create a Supabase project

Go to https://app.supabase.com → **New Project**. Pick a region close to you, set a strong DB password (you'll need it), and wait ~2 minutes for it to provision.

## 2 · Get your credentials

Open your project, then:

| What you need | Where to find it |
|---|---|
| `SUPABASE_URL`, `VITE_SUPABASE_URL` | Project Settings → API → **Project URL** |
| `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` | Project Settings → API → **anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** (secret) |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Settings → **JWT Secret** |
| `DATABASE_URL` | Project Settings → Database → Connection string → **URI** (Transaction pooler) |
| `DATABASE_URL_SYNC` | Same page → **Session** pooler |

For the two `DATABASE_URL` values, replace `[YOUR-PASSWORD]` with your DB password and change the prefix:

- `DATABASE_URL`: `postgresql://...` → `postgresql+asyncpg://...`
- `DATABASE_URL_SYNC`: `postgresql://...` → `postgresql+psycopg://...`

## 3 · Create the storage bucket

Supabase → **Storage** → **New bucket** → name it `proofs`, **Public: OFF**.

## 4 · Fill in `.env`

```bash
cp .env.example .env
# open .env in your editor and paste in the values
```

Then mirror to the frontend:

```bash
cp .env frontend/.env
```

> The frontend only reads variables prefixed with `VITE_`. The duplication is intentional — it keeps the build pipeline strict about what's exposed to the browser.

## 5 · Backend — install + migrate + run

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# Generate the schema migration from the SQLAlchemy models, then apply it
alembic revision --autogenerate -m "initial schema"
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

You should see:

```
INFO: DisciplineX starting in development mode
INFO: Scheduler started — daily discipline check at 23:59 UTC
INFO: Uvicorn running on http://0.0.0.0:8000
```

Verify: open http://localhost:8000/docs

## 6 · Frontend — install + run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 7 · Smoke test the full flow

1. Click **Create an account**, sign up.
2. Confirm via email link if Supabase email confirmations are on. (Toggle in Auth → Providers → Email → "Confirm email" if you want to skip for dev.)
3. Sign in. **First user is auto-promoted to admin.**
4. As admin: go to **Manage Tasks** → publish a task with today's date.
5. Open in another browser (or incognito), register a second user, and you'll see the task on **Today's Tasks**.
6. Submit proof from the user. As admin, open **Submission Queue** → **Approve**.
7. The user gets a real-time toast (Socket.IO) and their XP/streak updates instantly.
8. Open **AI Coach** to see burnout/procrastination scores once you have ~7 days of data.

## 8 · Optional — Docker one-shot

```bash
docker compose up --build
```

That brings up backend + frontend behind a single command. For production with Nginx + HTTPS, see `docs/DEPLOY.md`.

## File map

```
tracker-app/
├── .env                        ← YOU FILL THIS IN (copy of .env.example)
├── docker-compose.yml
├── README.md                   project overview
├── docs/
│   ├── SETUP.md                ← you are here
│   ├── PHASE1_SETUP.md         (deprecated — replaced by this file)
│   └── DEPLOY.md               production deployment
├── backend/
│   ├── app/
│   │   ├── main.py             FastAPI entry
│   │   ├── core/               config, db, security, middleware, rate limit
│   │   ├── models/             6 SQLAlchemy models (incl. AuditLog)
│   │   ├── schemas/            Pydantic v2
│   │   ├── api/v1/             auth, users, tasks, submissions, emergency,
│   │   │                       analytics, leaderboard, ai
│   │   └── services/           storage, scoring, scheduler, discipline,
│   │                           realtime, audit, ai/insights
│   ├── alembic/                migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── .env                    ← copy of root .env (VITE_* keys)
│   ├── src/
│   │   ├── pages/              Login, Register, Dashboard, Tasks, Leaderboard,
│   │   │                       Streak, AICoach, Emergency, Settings,
│   │   │                       admin/ManageTasks, admin/Submissions,
│   │   │                       admin/EmergencyQueue
│   │   ├── components/         Layout, Sidebar, Topbar, ProtectedRoute,
│   │   │                       TaskCard, SubmitProofModal, ui/*, charts/*
│   │   ├── hooks/useRealtime.ts
│   │   ├── lib/                supabase, api, socket, cn
│   │   ├── store/auth.ts
│   │   └── types/index.ts
│   └── Dockerfile
└── nginx/
    └── nginx.conf              reverse proxy (production profile)
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `pydantic_core.ValidationError` on backend startup | Missing required env var. Diff your `.env` against `.env.example`. |
| `connection refused` from Alembic | Use the **Session** pooler URL (port 5432) for `DATABASE_URL_SYNC`. |
| `password authentication failed` | You forgot to replace `[YOUR-PASSWORD]` in the URLs. |
| `Invalid auth token` on `/auth/me` | `SUPABASE_JWT_SECRET` doesn't match the one in your Supabase project. |
| Socket disconnects immediately | Same JWT secret issue, or you forgot the `auth.token` in the connect call (the bundled hook handles it for you). |
| First user wasn't admin | Check `AUTO_PROMOTE_FIRST_USER=true` in `.env`. If it was already false, manually update the row in Supabase. |
| Storage upload returns 400 | `proofs` bucket doesn't exist, or filename has an unsupported MIME (allowed: png/jpeg/webp/gif/pdf). |
| Discipline check didn't run at 23:59 | Server time is UTC; the cron runs in UTC. Adjust `DAILY_CUTOFF_HOUR/MINUTE` for a different time. |

## What you have now

- ✅ **Auth** via Supabase (no password handling on our end)
- ✅ **Tasks** — admin CRUD, global daily assignment with difficulty/points/deadlines
- ✅ **Proof upload** to Supabase Storage (image/PDF/stopwatch/code/links/notes)
- ✅ **Admin verification** with feedback, XP awarded on approve
- ✅ **Discipline engine** — APScheduler daily 23:59 UTC, locks users who miss required tasks
- ✅ **Emergency override** — user submits → admin approves → temporary unlock
- ✅ **Analytics** — daily/weekly/monthly rollups via pandas, heatmap data
- ✅ **Leaderboard** — all-time / daily / weekly / monthly / streak rankings, podium UI
- ✅ **Realtime** — Socket.IO for live approval pings, leaderboard invalidation, emergency notifications
- ✅ **AI Coach** — burnout risk, procrastination index, EWMA forecast, behavioral recommendations (sklearn + numpy)
- ✅ **Security** — rate limiting (slowapi), security headers, request IDs, audit log model, JWT verified locally
- ✅ **UI** — dark futuristic theme, glassmorphism, neon gradients, Framer Motion, Recharts
- ✅ **Production** — Dockerfiles, docker-compose, Nginx config, deploy guide
