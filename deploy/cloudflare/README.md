# Deploy Code Medium — Cloudflare Pages + Render + Supabase + Better Stack

Free-forever stack, **no credit card required**:

| Piece | Platform | Free limits |
|---|---|---|
| Frontend (Next.js static `out/`) | Cloudflare Pages | Unlimited bandwidth |
| Backend (Express + Prisma) | Render web service | 512MB RAM, free plan |
| Database (PostgreSQL) | Supabase | 500MB storage |
| Keep-alive + uptime alerts | Better Stack | 10 monitors @ 1-min |

---

## 1. Database — Supabase

1. Sign up at https://supabase.com (free plan, no card) and **New Project**.
2. Project → **Settings → Database** → copy the **Connection string (URI)** → pick the
   **direct** PostgreSQL connection. It looks like:
   `postgresql://postgres.<ref>:<PASSWORD>@db.<ref>.supabase.co:5432/postgres`
3. Prisma needs SSL, so append `?sslmode=require` to it. That's your `DATABASE_URL`.
4. Reset the DB password under **Settings → Database → Reset database password** if you
   need a fresh one. Keep this value handy.

## 2. Backend — Render (uses `render.yaml`)

1. Sign up at https://render.com (no card). **New → Blueprint** → connect your GitHub repo.
2. Select `CodeMedium` — Render detects `render.yaml` and shows the `codemedium-api` service.
3. Fill in the secret env values before deploying:
   - `DATABASE_URL` — from step 1 (with `?sslmode=require`)
   - `JWT_SECRET` — random string (`openssl rand -hex 32`)
   - `SMTP_USER` / `SMTP_PASS` — Gmail + app password, **or** `BREVO_API_KEY` instead
   - `SMTP_FROM` — e.g. `Code Medium <you@gmail.com>`
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — your admin login
   - `CORS_ORIGIN` — leave blank for now; set it in step 3 after Cloudflare is live
4. Apply. On the free plan the build takes a few minutes.
5. Copy your service URL: `https://codemedium-api.onrender.com`. Verify:
   `https://codemedium-api.onrender.com/health` → `{"ok":true}`

Migrations run automatically on every deploy (`prisma migrate deploy` before start).

## 3. Frontend — Cloudflare Pages

1. Sign up at https://dash.cloudflare.com (free, no card).
2. **Workers & Pages → Create → Pages → Connect to Git** → select the repo.
3. Build settings:
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `out`
   - **Environment variables:**
     - `NODE_VERSION` = `22`
     - `NEXT_PUBLIC_API_BASE_URL` = `https://codemedium-api.onrender.com` (no trailing slash)
4. **Save and Deploy.** Your site is at `https://<project>.pages.dev`.

> Note: `NEXT_PUBLIC_*` values are baked in at build time. Changing the API URL
> requires a redeploy (which Pages does automatically on git push).

## 4. CORS

Back on Render, edit the `codemedium-api` service → **Environment** → set
`CORS_ORIGIN` to `https://<project>.pages.dev` (no trailing slash) → **Save & Deploy**.

(The backend defaults to `*` if unset, so the site works either way — this just locks it down.)

## 5. Keep-alive + alerts — Better Stack

Render free services sleep after 15 min idle. Fix it by pinging `/health`:

1. Sign up at https://betterstack.com (free, no card).
2. **Uptime → Add monitor** → type **HTTP(S)**
   - URL: `https://codemedium-api.onrender.com/health`
   - Check interval: **1 minute** (free)
   - Request timeout: **60 seconds** (so the ~50s first boot after a deploy isn't flagged)
3. Save. This keeps the backend awake 24/7 and emails you if it ever goes down.

## 6. Updating

Everything auto-deploys on `git push`:
- Render rebuilds + restarts the backend (migrations first).
- Cloudflare Pages rebuilds the frontend.
- No downtime on either.

## Caveats

- **Render free:** instance wakes in ~50s right after a deploy; the Better Stack ping keeps
  it warm the rest of the time.
- **Supabase free:** projects *pause* after 7 days of no database activity and auto-wake on
  the next request. During your event (real registrations) it stays active. If you want it
  warm all year, set the Better Stack monitor to `https://codemedium-api.onrender.com/announcement`
  instead of `/health` — that endpoint reads the DB, keeping both warm.
- **Cost:** $0/month across all four services.
