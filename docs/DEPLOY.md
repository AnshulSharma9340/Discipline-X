# Deploying DisciplineX

Recommended split (free tiers):
- **Frontend** → Vercel (Vite SPA, auto deploys from GitHub)
- **Backend** → Render (FastAPI web service, auto deploys from GitHub)
- **Database** → Supabase (Postgres + Auth + Storage)

You'll end up with two URLs:
- `https://discipline-x.vercel.app` (or your custom domain)
- `https://disciplinex-backend.onrender.com` (or similar)

---

## Pre-flight checklist

### 1. Supabase project is configured
- [ ] Storage bucket `proofs` exists, **Public OFF**
- [ ] Auth → Providers → Email enabled
- [ ] All 6 secrets noted (URL, anon key, service_role key, JWT secret, DATABASE_URL, DATABASE_URL_SYNC)

### 2. Generate a production SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Save it. Paste into Render later.

---

## Deploy backend on Render

### Option A — Blueprint (recommended)

1. https://dashboard.render.com → **New** → **Blueprint**
2. Connect GitHub → select your `Discipline-X` repo
3. Render auto-detects `render.yaml`. Click **Apply**.
4. First deploy fails (env vars missing) — expected.
5. Click into `disciplinex-backend` → **Environment** tab → fill:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://YOUR-REF.supabase.co` |
| `SUPABASE_ANON_KEY` | long `eyJ...` anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | long `eyJ...` service_role key |
| `SUPABASE_JWT_SECRET` | from Supabase API settings (any value if asymmetric) |
| `DATABASE_URL` | `postgresql+asyncpg://postgres.REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres` |
| `DATABASE_URL_SYNC` | `postgresql+psycopg://postgres.REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres` |
| `BACKEND_CORS_ORIGINS` | leave blank for now |
| `GROQ_API_KEY` | optional |

6. **Save** → Render auto-redeploys → wait for **Live** ✓
7. Visit `https://disciplinex-backend-XXXX.onrender.com/health` → should return `{"status":"ok"}`. Note this URL.

### Render free tier note
Service sleeps after 15 min of inactivity. First request after sleep takes ~30s to wake up.

---

## Deploy frontend on Vercel

1. https://vercel.com/new → **Import** your GitHub repo
2. **Root Directory**: `frontend`
3. Framework auto-detected: **Vite**
4. **Environment Variables**:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `VITE_API_BASE_URL` | `https://disciplinex-backend-XXXX.onrender.com/api/v1` |

5. **Deploy** → ~60 seconds → URL like `https://discipline-x.vercel.app`.

---

## Wire CORS (final step)

Tell backend to accept your frontend:

1. Render dashboard → `disciplinex-backend` → **Environment**
2. Edit `BACKEND_CORS_ORIGINS`:
   ```
   https://your-app.vercel.app
   ```
3. Save → Render redeploys.

Open `https://your-app.vercel.app` → register → done.

---

## Testing the live deployment

1. Visit your Vercel URL
2. **Register** an account
3. **Create an organization** (you become OWNER)
4. **Manage Tasks** → publish a test task
5. Submit → review yourself → confirm streak/XP updates

Logs:
- Backend: Render → `disciplinex-backend` → **Logs**
- Frontend: Vercel → project → **Deployments**

---

## Custom domain (optional)

### Frontend on Vercel
1. Vercel project → **Settings** → **Domains** → Add domain
2. Update DNS (CNAME or A record)
3. Wait ~5 min for SSL

### Backend on Render
1. Render service → **Settings** → **Custom Domain** → Add
2. Update DNS
3. Update `VITE_API_BASE_URL` on Vercel to use new domain
4. Update `BACKEND_CORS_ORIGINS` on Render
5. Both auto-redeploy

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Render build fails on `alembic upgrade head` | Check `DATABASE_URL_SYNC` is set, password URL-encoded if it has special chars |
| Frontend loads but API calls hit CORS error | Add Vercel URL to `BACKEND_CORS_ORIGINS`, redeploy backend |
| `/health` returns 502 | Render free tier sleeping. First request takes ~30s to wake. Refresh. |
| `/auth/me` returns 401 | `SUPABASE_JWT_SECRET` mismatch, or check `SUPABASE_URL` |
| Storage uploads fail | Bucket `proofs` doesn't exist or wrong name |
| Daily discipline cron not running | Render free tier sleeps. Either ping `/health` periodically or upgrade. |

---

## Production hardening

- [ ] `BACKEND_ENV=production`, `AUTO_PROMOTE_FIRST_USER=false`
- [ ] Re-enable Supabase email confirmation
- [ ] Custom domain
- [ ] Supabase Pro for backups + connection pool
- [ ] Uptime monitoring on `/health` (uptimerobot.com is free)
- [ ] Sentry or similar for error tracking
- [ ] Render paid tier ($7/mo) — no sleep, faster
