-- Signalbrief schema
create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists trends (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  platform text not null
    check (platform in ('tiktok', 'youtube', 'instagram', 'x', 'reddit', 'meta')),
  external_id text not null,
  title text not null,
  url text not null,
  thumbnail_url text,
  creator_handle text,
  metrics jsonb not null default '{}'::jsonb,
  heat_score int not null default 0,
  category text not null,
  insight text,
  sound_or_format text,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, platform, external_id)
);

create index if not exists trends_report_id_idx on trends(report_id);
create index if not exists trends_category_idx on trends(category);
create index if not exists trends_heat_score_idx on trends(heat_score desc);
create index if not exists reports_report_date_idx on reports(report_date desc);

insert into categories (name, sort_order) values
  ('Sounds & Audio', 1),
  ('Formats & Challenges', 2),
  ('Memes & Humor', 3),
  ('Products & Brands', 4),
  ('News & Culture', 5),
  ('Beauty & Fashion', 6),
  ('Fitness & Wellness', 7),
  ('Food & Drink', 8),
  ('Tech & Gaming', 9),
  ('Other', 10)
on conflict (name) do nothing;
