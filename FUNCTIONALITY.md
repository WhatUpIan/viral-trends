# Signalbrief — Functionality Overview

Focused SaaS for **US video trends**, **memes**, **brand mentions**, and **brand feedback**.

**Live app:** https://viral-trends-kn52.vercel.app/

---

## Four pillars

| Pillar | Route | What it does |
|--------|-------|--------------|
| **Trends** | `/` | Daily US remake-ready short-form report (grid) |
| **Memes** | `/memes` | Memes & Humor + Formats & Challenges from the same report |
| **Brand Mentions** | `/mentions`, `/brands/[id]` | Social + web mentions (SearchAPI + CreatorCrawl) |
| **Brand Feedback** | `/feedback`, `/brands/[id]?tab=feedback` | Comments on mentions |

**Also:** AI brand setup (`/brands/new`), category prefs (`/settings/categories`), auth (`/login`, `/signup`), archive (`/archive`, `/report/[date]`).

---

## What was cut

Hard-cut from the Internet Intelligence sprawl. These routes redirect to `/` or `/brands`:

Dashboard, Morning Brief, Trend Database, Opportunities, Competitors, Assistant, Search, entity profiles, `/trends` (merged into `/`).

Entity-graph tables from migrations `006`/`007` remain in the DB but are **unused** — ingest no longer writes to them.

---

## Data pipelines (kept)

| Pipeline | Endpoint | Sources |
|----------|----------|---------|
| Daily trends ingest | `/api/cron/ingest` (+ admin button) | CreatorCrawl → classify → `reports`/`trends` |
| Brand monitoring | `/api/cron/mentions` (+ Run monitoring) | CreatorCrawl social + SearchAPI web/news |
| Brand research | `/api/brands/research` | Homepage fetch + SearchAPI + OpenAI |
| Brand create | `/api/brands/create` | Supabase brands/keywords/socials |

Admin **Run daily ingest** is limited to `ianmcarson@gmail.com`.

---

## Auth & shell

- Supabase Auth (email/password), RLS on user tables
- `AppChrome` top nav: Trends · Memes · Mentions · Feedback · Brands
- Protected: `/brands`, `/mentions`, `/feedback`, `/settings`
- Trends and Memes are public; brands require login

---

## Migrations

Run `001` → `007` in order. Treat `006_entity_graph` and `007_trend_adoption` as **legacy schema** (dormant).
