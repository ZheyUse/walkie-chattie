-- Add display_name and status columns to space_members table.

begin;

alter table public.space_members
  add column if not exists display_name text,
  add column if not exists status text default 'online';

-- Ensure blacklisted column exists for the kick/rejoin fix
alter table public.space_members
  add column if not exists blacklisted boolean not null default false;

commit;