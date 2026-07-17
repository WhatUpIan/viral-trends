# Signalbrief — Functionality Overview

Local reference for everything the app does today.  
Positioning: **Internet Intelligence** for marketers and content creators.

**Live app:** https://viral-trends-kn52.vercel.app/

---

## Product framing

| Module | Status |
|--------|--------|
| **My Dashboard** | Shipped |
| **Morning Brief** (AI analyst) | Shipped |
| **Trends** (daily report grid) | Shipped |
| **Brands** (entity profile + mentions) | Shipped |
| **Entity graph** (schema) | Shipped |
| **Trend Database** | Phase 2 — shipped |
| **AI trend / entity conversation** | Phase 2 — shipped |
| **Universal Search** | Phase 2 — shipped |
| **Competitors compare** | Phase 2 — shipped |
| **Opportunity Engine** | Phase 2 — shipped |
| **Entity profiles** (creator, sound, topic, …) | Phase 2 — shipped |
| **AI Assistant** | Phase 2 — shipped |
| Mobile Instagram-style brief | Deferred |
| WebSocket live terminal | Deferred |

Everything updates on page load / after monitoring runs (no live sockets yet).

---

## Modules

### Dashboard (`/dashboard`)
KPI strip, Brand Health, Internet Right Now, Alerts.

### Morning Brief (`/brief`)
AI overnight narrative; cached in `daily_briefs`.

### Trends (`/trends`)
Daily categorized remake-ready report. Cards link into Trend Database.

### Trend Database (`/database`, `/database/[slug]`)
Permanent trend entities with lifecycle fields, related creators/sounds/topics, and AI Q&A.

### Search (`/search`)
One query across entity graph + brands + today’s report titles.

### Opportunities (`/opportunities`)
White-space scores: high heat × under-represented industries.

### Brands (`/brands`)
AI setup, health strip, mentions, feedback, keywords.

### Competitors (`/competitors`)
Per-brand compare table: mention hits, 7d, sentiment, SOV estimate.

### Assistant (`/assistant`)
Chat: brand health, complaints, competitors, what trend to join.

### Entity profiles (`/entities/[type]/[slug]`)
Graph pages for creators, sounds, topics, companies, etc. (trends redirect to `/database/[slug]`).

---

## Entity graph

Tables: `entities`, `entity_edges`, bridges, `daily_briefs`.  
Types: brand, trend, creator, sound, video, product, company, topic, keyword, meme, news.

---

## Auth & shell

Nav: Dashboard · Brief · Search · Trends · Database · Opportunities · Brands · Competitors · Assistant · Settings.

Protected prefixes include all of the above plus `/entities`.

---

## Deferred (later)

- Instagram-style mobile daily brief swipe
- True WebSocket / live terminal updates
- Richer industry presence from web crawl (Opportunity Engine currently heuristic)

---

*For setup/deploy, see `README.md`.*
