-- Trend industry adoption stats for Opportunity Engine v2

create table if not exists trend_industry_stats (
  id uuid primary key default gen_random_uuid(),
  trend_entity_id uuid not null references entities(id) on delete cascade,
  industry text not null,
  brand_count int not null default 0,
  creator_count int not null default 0,
  evidence_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (trend_entity_id, industry)
);

create index if not exists trend_industry_stats_trend_idx on trend_industry_stats(trend_entity_id);
create index if not exists trend_industry_stats_industry_idx on trend_industry_stats(industry);

alter table trend_industry_stats enable row level security;

drop policy if exists "trend_industry_stats_select" on trend_industry_stats;
create policy "trend_industry_stats_select" on trend_industry_stats
  for select using (auth.role() = 'authenticated');
