-- Fix infinite recursion in RLS policies for Walkie-Chattie.
-- Run this whole file in the Supabase SQL editor.
--
-- The important bit: policies must not directly query public.space_members
-- from inside another public.space_members policy. These SECURITY DEFINER
-- helpers centralize that membership check with row_security disabled.

begin;

create or replace function public.is_space_member(target_space_id text, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
      and sm.user_id = target_user_id
      and coalesce(sm.blacklisted, false) = false
  );
$$;

create or replace function public.is_space_admin(target_space_id text, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.spaces s
    where s.id = target_space_id
      and s.owner_id = target_user_id
  );
$$;

revoke all on function public.is_space_member(text, uuid) from public;
revoke all on function public.is_space_admin(text, uuid) from public;
grant execute on function public.is_space_member(text, uuid) to authenticated;
grant execute on function public.is_space_admin(text, uuid) to authenticated;

-- Remove every existing policy on these tables. This clears old policy names
-- from earlier setup attempts, including recursive ones from the guide.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('space_members', 'messages', 'spaces')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.messages enable row level security;

create policy "Members can read their spaces" on public.spaces
  for select
  using (public.is_space_member(id, auth.uid()));

create policy "Owner can update space" on public.spaces
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Authenticated can create spaces" on public.spaces
  for insert
  with check (auth.uid() = owner_id);

create policy "Members can see other members" on public.space_members
  for select
  using (public.is_space_member(space_id, auth.uid()));

create policy "Users can insert self" on public.space_members
  for insert
  with check (
    user_id = auth.uid()
    and coalesce(blacklisted, false) = false
    and (
      role = 'member'
      or (
        role = 'admin'
        and exists (
          select 1
          from public.spaces s
          where s.id = space_id
            and s.owner_id = auth.uid()
        )
      )
    )
  );

create policy "Users can delete self" on public.space_members
  for delete
  using (
    user_id = auth.uid()
    and not public.is_space_admin(space_id, auth.uid())
  );

create policy "Owners can delete members" on public.space_members
  for delete
  using (
    public.is_space_admin(space_id, auth.uid())
    and user_id <> auth.uid()
  );

create policy "Admins can update members" on public.space_members
  for update
  using (public.is_space_admin(space_id, auth.uid()))
  with check (
    public.is_space_admin(space_id, auth.uid())
    and user_id <> auth.uid()
  );

create policy "Members can read space messages" on public.messages
  for select
  using (
    public.is_space_member(space_id, auth.uid())
    and (
      type != 'whisper'
      or sender_id = auth.uid()
      or target_user_id = auth.uid()
    )
  );

create policy "Members can insert messages" on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and public.is_space_member(space_id, auth.uid())
  );

create policy "Admins can delete all messages" on public.messages
  for delete
  using (public.is_space_admin(space_id, auth.uid()));

commit;
