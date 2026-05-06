# Phase 1 — First-run setup checklist

Phase 1 ships the foundation: auth, all 5 SQLAlchemy models, dark futuristic UI shell, role-based routing, login/register via Supabase Auth. Everything else (task CRUD, proof upload, leaderboard, AI) is scaffolded for the next phases.

## Step-by-step

### 1. Create your Supabase project

1. Go to https://app.supabase.com → **New Project**.
2. Once provisioned, open **Project Settings → API**:
   - Copy `Project URL`
   - Copy `anon public` key
   - Copy `service_role` key (keep secret)
   - Copy `JWT Secret`
3. Open **Project Settings → Database → Connection string → URI** and copy both:
   - **Transaction** pooler URL → use for `DATABASE_URL` (the app)
   - **Session** pooler URL → use for `DATABASE_URL_SYNC` (Alembic migrations)

   Replace `[YOUR-PASSWORD]` with the database password you set when creating the project.

   For SQLAlchemy, change the URL prefix:
   - `DATABASE_URL`: `postgresql://...` → `postgresql+asyncpg://...`
   - `DATABASE_URL_SYNC`: `postgresql://...` → `postgresql+psycopg://...`

### 2. Configure environment variables

```bash
cp .env.example .env
# fill in real values from step 1
cp .env frontend/.env
```

The frontend only reads `VITE_*` variables — those mirror the Supabase URL and anon key.

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Generate the initial migration from your models:
alembic revision --autogenerate -m "initial schema"

# Apply it to Supabase:
alembic upgrade head

# Run the API:
uvicorn app.main:app --reload --port 8000
```

Visit http://localhost:8000/docs to see the OpenAPI explorer. You should see `GET /health`, `GET /api/v1/auth/me`, and `PATCH /api/v1/users/me`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173.

### 5. Smoke test

1. Click **Create an account** on the login page.
2. Sign up with email + password (Supabase will email a confirmation link if email confirmations are on — toggle in **Authentication → Providers → Email** if you want to skip for dev).
3. After confirming, sign in.
4. The first user is auto-promoted to **admin** (controlled by `AUTO_PROMOTE_FIRST_USER=true`).
5. You should see the admin sidebar section with `Admin Console`, `Manage Tasks`, etc.

### 6. Verify the auth pipeline

Open browser devtools → Network → look at the `GET /api/v1/auth/me` request. You should see:
- `Authorization: Bearer eyJ...` header (Supabase JWT)
- 200 response with `{ "user": { ... } }`

If you get 401, double-check `SUPABASE_JWT_SECRET` in `.env` matches the one in Supabase API settings.

## Common gotchas

| Issue | Fix |
|---|---|
| `pydantic_core._pydantic_core.ValidationError` on startup | Missing env var. Re-check `.env` against `.env.example`. |
| `connection refused` from Alembic | Use the **Session** pooler URL (port 5432), not the direct connection. |
| `Invalid auth token` on `/auth/me` | `SUPABASE_JWT_SECRET` mismatch, or token from a different project. |
| First user not admin | Confirm `AUTO_PROMOTE_FIRST_USER=true` in `.env`. |

## What's next

Tell me when this is running and I'll start Phase 2 (task CRUD + proof upload + admin verification).
