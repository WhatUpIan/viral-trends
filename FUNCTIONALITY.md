# Signalbrief — Functionality Overview

Local reference for everything the app does today.  
Positioning: **Internet Intelligence** for marketers and content creators — not just “daily trends + brand monitoring.”

**Live app:** https://viral-trends-kn52.vercel.app/

---

## Product framing

| Module | Status |
|--------|--------|
| **My Dashboard** | Phase 1 — logged-in home |
| **Morning Brief** (AI analyst) | Phase 1 |
| **Trends** (daily report grid) | Phase 1 — module, not home |
| **Brands** (entity profile + mentions) | Phase 1 — deep profile |
| **Entity graph** (schema) | Phase 1 — full schema; Brand is first rich UI |
| Trend Database pages + AI trend chat | Deferred (Phase 2) |
| Universal Search | Deferred |
| Competitors compare workspace | Deferred |
| Opportunity Engine UI | Deferred |
| Full AI chat assistant | Deferred |
| Mobile Instagram-style brief | Deferred |
| WebSocket live terminal | Deferred |

Everything updates on page load / after monitoring runs (no live sockets yet).

---

## 1. My Dashboard (`/dashboard`)

Logged-in home (guests still see the public trends snapshot on `/`).

- Greeting (“Good morning, …”)
- KPI strip: Brand Health, Mentions Today, Unread, Trending Opportunities, High Risk Alerts, New Viral Trends (+ competitors mentioned estimate)
- **Left — Brand Health:** mentions over time sparkline, sentiment mix, top keywords, new creators
- **Center — Internet Right Now:** top trends, fastest growing, top sounds, most remixed format (from latest daily report)
- **Right — Alerts:** narrative cards from mentions + competitor/trend heuristics

---

## 2. Morning Brief (`/brief`)

AI analyst narrative (OpenAI when keyed; template fallback). Cached per user/day in `daily_briefs`.

- Intro + overnight change bullets
- Opportunity callout
- Regenerate action

Trends **grid** remains the Trends module; Brief is the narrative layer.

---

## 3. Trends module (`/trends`)

Former homepage report:

- Category grid of remake-oriented US short-form signals
- Heat scores, insights, platform filters
- Date archives at `/report/[date]`, `/archive`
- Category order respects `/settings/categories` prefs

**Ingest:** `/api/cron/ingest` daily → CreatorCrawl → score → classify → persist → **entity graph upserts** (trends, creators, sounds, topics).

---

## 4. Brands (first rich entity)

- AI setup: name + URL → research → review → save (profile, socials, ~20 keywords, competitors/topics into graph)
- Dashboard header + **Brand Health strip:** overall score, sentiment, share of voice estimate, competitors, avg daily mentions, growing topics, AI insight blurb
- Mentions / Feedback / Profile tabs (workflow flags: viewed, responded, highlighted)
- Own-account filtering; negative keywords; Run monitoring

Competitors stored as `company` entities + `competes_with` edges (compare UI deferred).

---

## 5. Entity graph (schema)

Tables: `entities`, `entity_edges`, bridges on `brands.entity_id` / `trends.entity_id` / `brand_mentions.entity_id`, `daily_briefs`, brand `insight_cache`.

**Types:** brand, trend, creator, sound, video, product, company, topic, keyword, meme, news.

**Relations:** mentions, competes_with, uses_sound, created_by, about_topic, appears_in, related_keyword, sells_product.

Thin API: `lib/entities.ts`, linking via `lib/entity-link.ts` from ingest + brand create.

Profile pages for non-brand entities are **not** shipped in Phase 1.

---

## 6. Auth & shell

- Email/password Supabase Auth
- `AppShell` nav: Dashboard · Brief · Trends · Brands · Settings
- Protected: `/dashboard`, `/brief`, `/trends`, `/brands`, `/settings`
- `/` redirects logged-in users to `/dashboard`

---

## 7. Data model (Supabase)

| Table | Role |
|-------|------|
| `reports` / `trends` | Daily report snapshots |
| `profiles` / `user_category_prefs` | Auth profile + category order |
| `brands` / keywords / social / mentions / comments | Brand monitoring |
| `entities` / `entity_edges` | Permanent intelligence graph |
| `daily_briefs` | Cached morning briefs |

Migrations: `001` → `006`.

---

## 8. External services

CreatorCrawl · OpenAI · SearchAPI.io · Supabase · Vercel Cron

---

## 9. Environment variables

Same as README: Supabase, CreatorCrawl, CRON_SECRET, OPENAI (brief + brand research + insights), SEARCHAPI (web mentions + research enrichment).

---

## 10. Typical journeys

**Marketer (intelligence):** Sign in → Dashboard KPIs/alerts → Morning Brief → drill into Brands or Trends.

**Brand manager:** Add brand (AI) → Run monitoring → triage Mentions/Feedback → Profile health + keywords.

**Guest:** Public trends snapshot on `/` or `/preview`.

---

*For setup/deploy, see `README.md`. Phase 2 = Trend Database, Search, Competitors compare, Opportunity Engine, deeper graph UI.*
