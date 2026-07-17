-- Entity graph: permanent catalog of internet intelligence objects + relationships.
-- Bridges existing brands/trends rows without breaking daily report snapshots.

create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'brand', 'trend', 'creator', 'sound', 'video', 'product',
    'company', 'topic', 'keyword', 'meme', 'news'
  )),
  slug text not null,
  name text not null,
  attrs jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz,
  peak_at timestamptz,
  status text not null default 'unknown' check (status in (
    'emerging', 'rising', 'peaking', 'declining', 'stable', 'unknown'
  )),
  owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, slug)
);

create index if not exists entities_type_status_idx on entities(type, status);
create index if not exists entities_owner_idx on entities(owner_user_id) where owner_user_id is not null;
create index if not exists entities_name_idx on entities(name);

create table if not exists entity_edges (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references entities(id) on delete cascade,
  to_entity_id uuid not null references entities(id) on delete cascade,
  relation text not null,
  weight double precision not null default 1,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (from_entity_id, to_entity_id, relation),
  check (from_entity_id <> to_entity_id)
);

create index if not exists entity_edges_from_idx on entity_edges(from_entity_id);
create index if not exists entity_edges_to_idx on entity_edges(to_entity_id);
create index if not exists entity_edges_relation_idx on entity_edges(relation);

-- Bridge columns on existing tables
alter table brands add column if not exists entity_id uuid references entities(id) on delete set null;
alter table trends add column if not exists entity_id uuid references entities(id) on delete set null;
alter table brand_mentions add column if not exists entity_id uuid references entities(id) on delete set null;

create index if not exists brands_entity_id_idx on brands(entity_id) where entity_id is not null;
create index if not exists trends_entity_id_idx on trends(entity_id) where entity_id is not null;

-- Cached AI morning briefs per user/day
create table if not exists daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_date date not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, brief_date)
);

create index if not exists daily_briefs_user_date_idx on daily_briefs(user_id, brief_date desc);

-- Cached brand AI insight blurbs
alter table brands add column if not exists insight_cache jsonb;
alter table brands add column if not exists insight_cached_at timestamptz;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table entities enable row level security;
alter table entity_edges enable row level security;
alter table daily_briefs enable row level security;

-- Catalog entities (no owner): readable by authenticated users
-- Brand entities (owner set): readable by owner only
drop policy if exists "entities_select" on entities;
create policy "entities_select" on entities
  for select using (
    owner_user_id is null
    or auth.uid() = owner_user_id
  );

drop policy if exists "entities_insert_own" on entities;
create policy "entities_insert_own" on entities
  for insert with check (
    owner_user_id is null
    or auth.uid() = owner_user_id
  );

drop policy if exists "entities_update_own" on entities;
create policy "entities_update_own" on entities
  for update using (
    owner_user_id is null
    or auth.uid() = owner_user_id
  );

-- Edges: readable if both ends are readable (simplified: any authenticated)
drop policy if exists "entity_edges_select" on entity_edges;
create policy "entity_edges_select" on entity_edges
  for select using (auth.role() = 'authenticated');

drop policy if exists "entity_edges_insert" on entity_edges;
create policy "entity_edges_insert" on entity_edges
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "daily_briefs_all_own" on daily_briefs;
create policy "daily_briefs_all_own" on daily_briefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
