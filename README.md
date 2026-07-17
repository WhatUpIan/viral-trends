# Signalbrief — Daily Viral Trends Report

Daily short-form viral report for **marketers and content creators**. Pulls signals from TikTok, YouTube Shorts, Instagram / Meta Reels, X, and Reddit via [CreatorCrawl](https://creatorcrawl.com), scores heat, categorizes trends, and publishes a categorized daily brief.

Also includes **user accounts** (Supabase Auth), **per-user category priorities**, and **brand mention monitoring**: add a brand, get auto-generated keywords (plus custom and negative keywords), and track mentions across social platforms, Google, and Google News — including top comments for feedback tracking.

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
| `OPENAI_API_KEY` | Optional | Category + insight blurbs + brand keyword generation |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `SEARCHAPI_API_KEY` | Optional | Web + Google News brand mentions ([searchapi.io](https://www.searchapi.io)) |
| `CRON_SECRET` | Yes (ingest) | Auth for `/api/cron/ingest` and `/api/cron/mentions` |
| `USE_MOCK_REPORT` | Optional | `true` to use mock data on `/` |

## Database setup

1. Create a Supabase project.
2. Run the SQL migrations in order in the SQL editor (or via Supabase CLI): [`001_initial.sql`](supabase/migrations/001_initial.sql), [`002_auth_prefs_brands.sql`](supabase/migrations/002_auth_prefs_brands.sql), [`003_brand_social_accounts.sql`](supabase/migrations/003_brand_social_accounts.sql), [`004_mention_workflow.sql`](supabase/migrations/004_mention_workflow.sql).
3. In **Authentication → Providers**, make sure **Email** is enabled (it is by default). Optionally disable "Confirm email" for faster local testing.
4. Add URL + keys to `.env.local`.

Tables: `reports`, `trends`, `categories`, `profiles`, `user_category_prefs`, `brands`, `brand_keywords`, `brand_mentions`, `brand_mention_comments`.

## User accounts & category priorities

- `/signup` and `/login` — email + password via Supabase Auth.
- `/settings/categories` — logged-in users can reorder categories and hide ones they don't care about; the daily report follows their order.
- All user tables are protected with Row Level Security.

## Brand mention monitoring

- `/brands` — add a brand (name, website, description). Keywords are auto-generated with OpenAI (heuristic fallback without a key).
- **Custom keywords:** add product names, campaign hashtags, etc.
- **Negative keywords:** mentions containing these are excluded.
- `/api/cron/mentions` runs every 6 hours (see `vercel.json`): searches TikTok, YouTube, Instagram, and Reddit via CreatorCrawl plus Google, Bing, Google News, and YouTube via SearchAPI.io, then pulls top comments from recent social mentions for feedback tracking.
- Trigger manually: `curl -X POST "https://YOUR_DOMAIN/api/cron/mentions" -H "Authorization: Bearer $CRON_SECRET"`

**Credit note:** each brand uses up to 5 keywords × 4 social platforms per run (~20 CreatorCrawl calls) plus 2 SearchAPI calls per keyword, plus up to 5 comment fetches. Pause a brand from its detail page to stop its runs.

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
| `CREATORCRAWL_API_KEY` | Required for daily ingest + social mentions |
| `SEARCHAPI_API_KEY` | Optional — web/news brand mentions ([searchapi.io](https://www.searchapi.io)) |
| `CRON_SECRET` | Long random string; Vercel Cron uses it automatically |
| `OPENAI_API_KEY` | Optional |
| `OPENAI_MODEL` | Optional (`gpt-4o-mini`) |
| `USE_MOCK_REPORT` | Leave unset/`false` in production |

Run the SQL in [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) and [`supabase/migrations/002_auth_prefs_brands.sql`](supabase/migrations/002_auth_prefs_brands.sql) in Supabase before the first ingest.

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
0 10 * * *    →  GET /api/cron/ingest     (daily trends report)
0 */6 * * *   →  GET /api/cron/mentions   (brand mention monitor)
```

When `CRON_SECRET` is set in the Vercel project, scheduled runs send `Authorization: Bearer <CRON_SECRET>`, which both routes already check. Note: Hobby plan crons run at most once per day — the mentions cron will run daily there; upgrade to Pro for the 6-hour cadence.

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
