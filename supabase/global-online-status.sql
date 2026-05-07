-- Global online status tracking
-- Users appear "online" in ALL spaces they are members of, not just the space they're viewing

begin;

-- Add columns to profiles table for global online status
alter table public.profiles
  add column if not exists is_online boolean not null default false,
  add column if not exists last_seen_at timestamptz;

-- Create index for faster lookups
create index if not exists idx_profiles_is_online on public.profiles(is_online) where is_online = true;

commit;
