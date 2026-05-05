-- Add joined_at column to space_members table.
-- If it already exists this is a no-op.
alter table public.space_members
  add column if not exists joined_at timestamptz not null default now();