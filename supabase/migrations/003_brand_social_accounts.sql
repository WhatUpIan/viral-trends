-- Per-brand official social handles (used to skip own posts in mention monitoring)

create table if not exists brand_social_accounts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  platform text not null
    check (platform in ('tiktok', 'youtube', 'instagram', 'x', 'reddit')),
  handle text not null,
  created_at timestamptz not null default now(),
  unique (brand_id, platform)
);

create index if not exists brand_social_accounts_brand_idx on brand_social_accounts(brand_id);

alter table brand_social_accounts enable row level security;

drop policy if exists "brand_social_accounts_all_own" on brand_social_accounts;
create policy "brand_social_accounts_all_own" on brand_social_accounts
  for all using (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  );
