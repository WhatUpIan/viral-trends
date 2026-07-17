-- Auth profiles, user category priorities, and brand mention monitoring

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Per-user category priorities
-- ---------------------------------------------------------------------------
create table if not exists user_category_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  sort_order int not null default 0,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists user_category_prefs_user_idx on user_category_prefs(user_id);

alter table user_category_prefs enable row level security;

drop policy if exists "prefs_all_own" on user_category_prefs;
create policy "prefs_all_own" on user_category_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  website text,
  description text,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brands_user_idx on brands(user_id);

alter table brands enable row level security;

drop policy if exists "brands_all_own" on brands;
create policy "brands_all_own" on brands
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Brand keywords (generated | custom | negative)
-- ---------------------------------------------------------------------------
create table if not exists brand_keywords (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  keyword text not null,
  kind text not null check (kind in ('generated', 'custom', 'negative')),
  created_at timestamptz not null default now(),
  unique (brand_id, keyword, kind)
);

create index if not exists brand_keywords_brand_idx on brand_keywords(brand_id);

alter table brand_keywords enable row level security;

drop policy if exists "brand_keywords_all_own" on brand_keywords;
create policy "brand_keywords_all_own" on brand_keywords
  for all using (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Brand mentions (social + web)
-- ---------------------------------------------------------------------------
create table if not exists brand_mentions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  source text not null check (source in ('social', 'web')),
  platform text
    check (platform in ('tiktok', 'youtube', 'instagram', 'x', 'reddit', 'meta', 'web', 'news')),
  external_id text,
  url text not null,
  title text,
  snippet text,
  matched_keyword text,
  author text,
  metrics jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  created_at timestamptz not null default now(),
  unique (brand_id, url)
);

create index if not exists brand_mentions_brand_idx on brand_mentions(brand_id);
create index if not exists brand_mentions_published_idx on brand_mentions(published_at desc);

alter table brand_mentions enable row level security;

drop policy if exists "brand_mentions_select_own" on brand_mentions;
create policy "brand_mentions_select_own" on brand_mentions
  for select using (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  );

drop policy if exists "brand_mentions_delete_own" on brand_mentions;
create policy "brand_mentions_delete_own" on brand_mentions
  for delete using (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Comments / feedback attached to social mentions
-- ---------------------------------------------------------------------------
create table if not exists brand_mention_comments (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid not null references brand_mentions(id) on delete cascade,
  external_id text not null,
  author text,
  text text not null,
  like_count int,
  published_at timestamptz,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  created_at timestamptz not null default now(),
  unique (mention_id, external_id)
);

create index if not exists brand_mention_comments_mention_idx
  on brand_mention_comments(mention_id);

alter table brand_mention_comments enable row level security;

drop policy if exists "brand_mention_comments_select_own" on brand_mention_comments;
create policy "brand_mention_comments_select_own" on brand_mention_comments
  for select using (
    exists (
      select 1
      from brand_mentions m
      join brands b on b.id = m.brand_id
      where m.id = mention_id and b.user_id = auth.uid()
    )
  );
