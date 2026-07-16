# Signalbrief — Daily Viral Trends Report

Daily short-form viral report for **marketers and content creators**. Pulls signals from TikTok, YouTube Shorts, Instagram / Meta Reels, X, and Reddit via [CreatorCrawl](https://creatorcrawl.com), scores heat, categorizes trends, and publishes a categorized daily brief.

## Quick start

```bash
cd viral-trends
npm install
cp .env.example .env.local
# fill in keys (see below)
npm run dev
```

- **UI preview (mock data):** [http://localhost:3000/preview](http://localhost:3000/preview)
- **Today’s report:** [http://localhost:3000](http://localhost:3000)
- **About / scoring:** [http://localhost:3000/about](http://localhost:3000/about)
- **Archive:** [http://localhost:3000/archive](http://localhost:3000/archive)

For local UI without Supabase, set `USE_MOCK_REPORT=true` in `.env.local` so the home page serves sample trends.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (prod) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (prod) | Anon key (read) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (ingest) | Service role for cron writes |
| `CREATORCRAWL_API_KEY` | Yes (ingest) | Third-party social data |
| `OPENAI_API_KEY` | Optional | Category + insight blurbs |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `CRON_SECRET` | Yes (ingest) | Auth for `/api/cron/ingest` |
| `USE_MOCK_REPORT` | Optional | `true` to use mock data on `/` |

## Database setup

1. Create a Supabase project.
2. Run the SQL in [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) in the SQL editor (or via Supabase CLI).
3. Add URL + keys to `.env.local`.

Tables: `reports`, `trends`, `categories`.

## CreatorCrawl credits

- Signup: [creatorcrawl.com](https://creatorcrawl.com) — free credits to start, then pay-as-you-go (~$29 / 5k credits).
- **Each API call = 1 credit.** Daily ingest uses roughly **30–80 calls** (trending feeds, a few searches, curated Reddit/X pulls).
- Keep the job once-daily to stay cheap; results are stored in Supabase so the site does not re-hit CreatorCrawl on every page view.

## Run the daily ingest locally

With env vars set:

```bash
curl -X POST "http://localhost:3000/api/cron/ingest" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Or:

```bash
curl "http://localhost:3000/api/cron/ingest?secret=$CRON_SECRET"
```

Successful response:

```json
{ "ok": true, "reportDate": "2026-07-16", "trendCount": 42, "reportId": "..." }
```

## Deploy on Vercel

The app is set up for Vercel (Next.js + daily cron).

### 1. Push the repo

From `viral-trends/`:

```bash
git add .
git commit -m "Signalbrief daily viral report"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import in Vercel

1. [vercel.com/new](https://vercel.com/new) → import the Git repo.
2. **Root Directory:** leave as the repo root if `viral-trends` *is* the repo; if this folder lives inside a monorepo, set Root Directory to `viral-trends`.
3. Framework preset: **Next.js** (auto-detected).

### 3. Environment variables

In **Project → Settings → Environment Variables**, add for Production (and Preview if you want):

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only — never expose to client) |
| `CREATORCRAWL_API_KEY` | Required for daily ingest |
| `CRON_SECRET` | Long random string; Vercel Cron uses it automatically |
| `OPENAI_API_KEY` | Optional |
| `OPENAI_MODEL` | Optional (`gpt-4o-mini`) |
| `USE_MOCK_REPORT` | Leave unset/`false` in production |

Run the SQL in [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) in Supabase before the first ingest.

### 4. Deploy

Click **Deploy**. After it succeeds, trigger the first report:

```bash
curl -X POST "https://YOUR_DOMAIN.vercel.app/api/cron/ingest" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Or use **Deployments → … → Redeploy** after env vars are set, then hit the curl above once.

### Daily cron

[`vercel.json`](vercel.json) schedules:

```
0 10 * * *  →  GET /api/cron/ingest
```

(10:00 UTC daily.) When `CRON_SECRET` is set in the Vercel project, scheduled runs send `Authorization: Bearer <CRON_SECRET>`, which the route already checks.

**Plan notes**

- **Hobby:** daily crons are supported; function timeout is **60s** (current `maxDuration`). If ingest often times out, reduce adapter calls or upgrade.
- **Pro:** you can raise `maxDuration` to `300` in [`app/api/cron/ingest/route.ts`](app/api/cron/ingest/route.ts) for fuller multi-platform pulls.

## Architecture

1. Cron hits `/api/cron/ingest`
2. Platform adapters call CreatorCrawl and normalize to `TrendItem`
3. Virality scoring → heat 0–100
4. OpenAI (or heuristics) assigns category + “why act now” insight
5. Snapshot written to Supabase
6. `/` and `/report/[date]` read the snapshot with platform/category filters

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve build
npm run lint     # eslint
```

## Brand

**Signalbrief** — editorial daily brief, not a dense analytics dashboard.
