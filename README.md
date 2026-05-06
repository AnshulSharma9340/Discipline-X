# DisciplineX

AI-powered competitive productivity & discipline monitoring platform. Admins assign daily tasks, users submit proof, the system enforces accountability through scoring, streaks, leaderboards, and end-of-day account lockouts.

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI (async) · SQLAlchemy 2.0 · Alembic · APScheduler |
| Database | Supabase Postgres |
| Auth | Supabase Auth (JWT verified server-side) |
| Storage | Supabase Storage |
| Frontend | React 18 · Vite · TypeScript · Tailwind · Framer Motion · Recharts · Zustand |
| Realtime | Socket.IO (Phase 5) |
| Deploy | Docker · docker-compose · Nginx |

## Build phases

1. **Foundation** ← *current* — repo, auth, models, dark UI shell
2. **Core loop** — task CRUD, proof upload, admin verify
3. **Discipline engine** — daily lockout, emergency override
4. **Analytics + leaderboard**
5. **Realtime** — Socket.IO
6. **Security + production hardening**
7. **AI** — burnout prediction, procrastination detection

## Prerequisites

- **Supabase project** — create one free at https://supabase.com
- **Python 3.11+**
- **Node 20+**
- **Docker Desktop** (optional but recommended)

## First-time setup

### 1. Supabase

1. Create a new project at https://app.supabase.com.
2. Copy values from **Project Settings → API**:
   - Project URL → `SUPABASE_URL`, `VITE_SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`
   - `service_role` key (keep secret) → `SUPABASE_SERVICE_ROLE_KEY`
   - JWT Secret → `SUPABASE_JWT_SECRET`
3. **Project Settings → Database → Connection string → URI**: copy and paste into `DATABASE_URL` / `DATABASE_URL_SYNC`. Use the *Transaction* pooler for the app and the *Session* pooler for Alembic migrations.
4. **Storage**: create a bucket named `proofs` (Public OFF). We'll wire signed URLs in Phase 2.

### 2. Environment

```bash
cp .env.example .env
# fill in the Supabase values
cp .env frontend/.env   # frontend reads VITE_* variables
```

### 3. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# Generate the initial migration from the SQLAlchemy models, then apply it
alembic revision --autogenerate -m "initial schema"
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

Backend at http://localhost:8000 · OpenAPI docs at http://localhost:8000/docs

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend at http://localhost:5173

### 5. Docker (alternative one-shot)

```bash
docker-compose up --build
```

## Project structure

```
tracker-app/
├── backend/              FastAPI app
│   ├── app/
│   │   ├── core/         config, db, security
│   │   ├── models/       SQLAlchemy models
│   │   ├── schemas/      Pydantic schemas
│   │   ├── api/v1/       route modules
│   │   └── services/     business logic, integrations
│   └── alembic/          migrations
├── frontend/             React + Vite app
│   └── src/
│       ├── components/   reusable UI
│       ├── pages/        route pages
│       ├── lib/          supabase client, axios api
│       └── store/        zustand stores
├── nginx/                reverse proxy config (production)
└── docker-compose.yml
```

## Roles

- **Super Admin** — full control: tasks, verification, analytics, lockouts, emergency requests
- **User** — view assigned tasks, submit proof, see own dashboard, leaderboard, streak

Role is stored in our `users` table (synced from Supabase Auth on first login). First user signed up is automatically promoted to admin (configurable).

## Conventions

- All API routes under `/api/v1`
- All times stored in UTC
- All money/score values in integer points (no floats)
- Dark theme is the only theme (intentional product choice)
