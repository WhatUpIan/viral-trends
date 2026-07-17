# Internet Intelligence — Phase 3 Plan

## Goal

Make the **Opportunity Engine** and **entity graph** trustworthy:

- **Today:** industry “presence” is a string match on trend title/attrs (`lib/opportunity.ts`).
- **Target:** each trend has **counted adoption by industry/brand**, scored white-space (“Construction: 0 · Insurance: 1 · Churches: 4 → Opportunity 96”), backed by graph edges.

**In scope:** Opportunity Engine v2 + denser graph linking + UI that surfaces adoption on trend/opportunity pages.

**Out of scope this phase:** mobile swipe brief, WebSocket live terminal, full chat history product (Phase 3.5).

---

## Architecture

```mermaid
flowchart LR
  ingest[Daily ingest + mentions]
  classify[Industry classifier]
  graph[entities + entity_edges]
  opp[Opportunity Engine v2]
  ui[Database / Opportunities / Search]

  ingest --> classify
  classify --> graph
  graph --> opp
  opp --> ui
  graph --> ui
```

---

## 1. Adoption signal model

New migration `supabase/migrations/007_trend_adoption.sql`:

**`trend_industry_stats`**
- `trend_entity_id`, `industry` (text), `brand_count`, `creator_count`, `evidence_count`, `updated_at`
- unique `(trend_entity_id, industry)`

**New edge relations** (on `entity_edges.relation`):
- `adopted_by` — brand/company ↔ trend
- `in_industry` — brand/company → topic(industry)
- `covered_by` — news → brand/topic when detectable
- Keep existing: `created_by`, `uses_sound`, `about_topic`, `competes_with`

**Industry taxonomy:** expand `OPPORTUNITY_INDUSTRIES` into shared `lib/industries.ts` (canonical list + aliases for “church/churches/faith”, “construction/contractor”, etc.).

---

## 2. Denser graph from existing pipelines

### A. Daily trend ingest (`lib/entity-link.ts`)

After linking creator/sound/topic:
- Upsert **video** entity (platform + external id) linked via `appears_in` / `created_by`
- Classify caption/title into 0–2 **industries** via OpenAI batch (or heuristic alias map) → `about_topic` edges to industry topics
- Detect known **brand/company** name hits in title (user brands + global company entities) → `adopted_by` / `mentions`
- Cap for Hobby 60s (top ~40 heat items, one batched OpenAI call for industry tags)

### B. Brand mentions ingest (`lib/mentions/ingest.ts`)

When a social/web mention is stored:
- Link mention author → creator (already partial)
- If mention text matches a **trend entity** (title/keyword/sound overlap), add `adopted_by` from brand entity → trend
- Upsert **news** entities for `platform=news` with `covered_by` → brand/topic

### C. Recompute job (`lib/adoption.ts`)

- Aggregate edges into `trend_industry_stats`
- Callable at end of ingest + optionally folded into mentions cron

---

## 3. Opportunity Engine v2

Rewrite scoring in `lib/opportunity.ts`:

```
score ≈ f(heat, status, whiteSpace, userIndustryFit)
whiteSpace = industries with brand_count == 0 (or below threshold)
userIndustryFit = boost if user's brand.metadata.industry is empty on that trend
```

Richer payload:
- `industryPresence: { industry, brandCount, evidenceCount }[]` (real counts)
- `adoptingBrands: { name, slug }[]` (sample)
- Honest “estimate” label when evidence is thin
- Per-user ranking: prioritize white space in **their** industry

**UI** — `app/opportunities/page.tsx` + `app/database/[slug]/page.tsx`:
- Industry adoption chips (`Construction 0`, `Insurance 1`, …)
- “Why this score” from real counts
- Links into adopting brand/company entity pages

---

## 4. Search + Database + Dashboard

- **Search:** group Industries, Adopting brands, News when present
- **Trend Database detail:** “Industries using this” + “Brands” from stats + `adopted_by`
- **Dashboard KPI:** count trends where user industry has `brand_count === 0` and heat ≥ threshold

---

## 5. Quality / cost constraints

- No N+1 OpenAI inside mention loops — batch industry classification
- Prefer service-role writes in cron; RLS unchanged for reads
- Never invent adoption counts; show `—` / “insufficient evidence” when stats empty
- Keep ingest under Vercel Hobby **60s**

---

## Implementation order

1. Migration `007` + `lib/industries.ts`
2. `lib/adoption.ts` recompute + wire into ingest/mentions
3. Enrich `entity-link` (video, industry topics, brand hits)
4. Opportunity Engine v2 scoring
5. Opportunities + Trend Database adoption UI
6. Search/Dashboard KPI tweaks + FUNCTIONALITY/README

---

## Success criteria

- Opportunity page shows **numeric industry adoption**, not keyword guesses
- High-heat trends show creators, sounds, topics, **and** industries/brands when evidence exists
- A brand in e.g. Construction sees opportunities ranked for **Construction: 0** white space
- Cron still completes on Hobby without new timeout failures

---

## Explicitly deferred (Phase 3.5+)

- Mobile swipe Morning Brief
- WebSocket live updates
- Persistent multi-day chat/brief history UI
- Full web crawl of “every brand using this sound” (out of credit budget) — Phase 3 uses **our** ingest + mention graph only
