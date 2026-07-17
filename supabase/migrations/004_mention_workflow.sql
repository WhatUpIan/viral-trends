-- Mention/feedback workflow flags, and Facebook + LinkedIn social accounts

-- Workflow flags on mentions
alter table brand_mentions add column if not exists viewed boolean not null default false;
alter table brand_mentions add column if not exists responded boolean not null default false;
alter table brand_mentions add column if not exists highlighted boolean not null default false;

-- Workflow flags on feedback comments
alter table brand_mention_comments add column if not exists viewed boolean not null default false;
alter table brand_mention_comments add column if not exists responded boolean not null default false;
alter table brand_mention_comments add column if not exists highlighted boolean not null default false;

-- Owners can update their mentions/comments (needed for the flags)
drop policy if exists "brand_mentions_update_own" on brand_mentions;
create policy "brand_mentions_update_own" on brand_mentions
  for update using (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
  );

drop policy if exists "brand_mention_comments_update_own" on brand_mention_comments;
create policy "brand_mention_comments_update_own" on brand_mention_comments
  for update using (
    exists (
      select 1
      from brand_mentions m
      join brands b on b.id = m.brand_id
      where m.id = mention_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from brand_mentions m
      join brands b on b.id = m.brand_id
      where m.id = mention_id and b.user_id = auth.uid()
    )
  );

-- Allow Facebook and LinkedIn handles
alter table brand_social_accounts drop constraint if exists brand_social_accounts_platform_check;
alter table brand_social_accounts add constraint brand_social_accounts_platform_check
  check (platform in ('tiktok', 'youtube', 'instagram', 'x', 'reddit', 'facebook', 'linkedin'));

alter table brand_mentions drop constraint if exists brand_mentions_platform_check;
alter table brand_mentions add constraint brand_mentions_platform_check
  check (platform in ('tiktok', 'youtube', 'instagram', 'x', 'reddit', 'meta', 'web', 'news', 'facebook', 'linkedin'));
