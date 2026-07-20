# Signalbrief — US trends & brand listening

Four pillars: **Trends**, **Memes**, **Brand Mentions**, and **Brand Feedback**.

Pulls short-form US signals via [CreatorCrawl](https://creatorcrawl.com), scores heat, and monitors brand mentions across social + the web ([SearchAPI.io](https://www.searchapi.io)). AI brand setup compiles profile, socials, and keywords from a name + URL.

See [`FUNCTIONALITY.md`](FUNCTIONALITY.md) for the product map.

## Quick start

```bash
cd viral-trends
npm install
cp .env.example .env.local
# fill in keys (see below)
npm run dev
```

- **Trends (home):** [http://localhost:3000/](http://localhost:3000/)
- **Memes:** [http://localhost:3000/memes](http://localhost:3000/memes)
- **Mentions / Feedback / Brands:** `/mentions`, `/feedback`, `/brands` (login required)
- **UI preview (mock):** [http://localhost:3000/preview](http://localhost:3000/preview)
- **Archive:** [http://localhost:3000/archive](http://localhost:3000/archive)

For local UI without Supabase, set `USE_MOCK_REPORT=true` in `.env.local`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (prod) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (prod) | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (ingest) | Service role for cron writes |
| `CREATORCRAWL_API_KEY` | Yes (ingest) | Social data |
| `OPENAI_API_KEY` | Optional | Classification + brand research |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `SEARCHAPI_API_KEY` | Optional | Web + news brand mentions |
| `CRON_SECRET` | Yes (ingest) | Auth for cron routes |
| `USE_MOCK_REPORT` | Optional | `true` for mock data on `/` |

## Database setup

1. Create a Supabase project.
2. Run migrations in order: `001` → `007` under [`supabase/migrations/`](supabase/migrations/).
3. Enable Email auth. Optionally disable “Confirm email” for local testing.
4. Add URL + keys to `.env.local`.

Core tables: `reports`, `trends`, `profiles`, `user_category_prefs`, `brands`, `brand_keywords`, `brand_mentions`, `brand_mention_comments`, `brand_social_accounts`.

Legacy (unused by app code): `entities`, `entity_edges`, `daily_briefs`, `trend_industry_stats` from migrations `006`/`007`.

## Product surfaces

- `/` — Trends (daily remake-ready report)
- `/memes` — Meme / format subset of the same report
- `/mentions` — Mentions across all your brands
- `/feedback` — Comments across all your brands
- `/brands`, `/brands/new`, `/brands/[id]` — list, AI setup, Mentions / Feedback / Profile tabs
- `/settings/categories` — category order for Trends
- `/login`, `/signup` — Supabase Auth (default redirect: `/`)

Old Phase 2/3 routes (`/dashboard`, `/brief`, `/database`, …) redirect away via [`proxy.ts`](proxy.ts).

## Brand monitoring

- **AI setup:** name + website → research → review → save
- Custom / negative keywords on the brand Profile tab
- Cron: `/api/cron/mentions` every 6 hours (see `vercel.json`)
- Manual: **Run monitoring** on Mentions hub or brand detail

**Credit note:** each brand uses up to ~5 keywords × 4 social platforms per run plus SearchAPI + comment fetches. Pause a brand to stop its runs.

## Daily trends ingest

```bash
curl -X POST "http://localhost:3000/api/cron/ingest" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Admin users (`ianmcarson@gmail.com`) also get a **Run daily ingest** button on Trends.

## Deploy on Vercel

1. Push the repo and import in Vercel (Root Directory = repo root if this folder *is* the repo).
2. Set env vars (table above).
3. Deploy, then run ingest once via curl.
4. Crons in [`vercel.json`](vercel.json): daily trends + mentions every 6h (Hobby may collapse mentions to daily).

## Architecture

1. Cron `/api/cron/ingest` → CreatorCrawl adapters → score → classify → Supabase snapshot
2. `/` and `/memes` read the latest snapshot
3. Cron `/api/cron/mentions` → CreatorCrawl + SearchAPI → mentions + comments
4. OpenAI used for trend classification and brand research only

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
