-- Extra brand context from AI research (industry, products, competitors, etc.)
alter table brands add column if not exists metadata jsonb not null default '{}'::jsonb;
