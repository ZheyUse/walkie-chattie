-- Fix infinite recursion in all RLS policies.
-- The policies used is_space_member() and is_space_admin() SECURITY DEFINER functions,
-- which query space_members/messages, triggering the policies again → infinite recursion.
--
-- Fix: replace all function-call policies with inline subqueries.
begin;

-- ── spaces ────────────────────────────────────────────────────────────────────

drop policy if exists "Members can read their spaces" on public.spaces;
create policy "Members can read their spaces" on public.spaces
  for select
  using (
    exists (
      select 1
      from public.space_members m
      where m.space_id = spaces.id
        and m.user_id = auth.uid()
        and coalesce(m.blacklisted, false) = false
    )
  );

-- ── space_members ────────────────────────────────────────────────────────────

drop policy if exists "Members can see other members" on public.space_members;
create policy "Members can see other members" on public.space_members
  for select
  using (
    exists (
      select 1
      from public.space_members m
      where m.space_id = space_members.space_id
        and m.user_id = auth.uid()
        and coalesce(m.blacklisted, false) = false
    )
  );

-- delete self
drop policy if exists "Users can delete self" on public.space_members;
create policy "Users can delete self" on public.space_members
  for delete
  using (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
  );

-- owners can delete members
drop policy if exists "Owners can delete members" on public.space_members;
create policy "Owners can delete members" on public.space_members
  for delete
  using (
    exists (
      select 1
      from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
    and user_id <> auth.uid()
  );

-- admins can update members
drop policy if exists "Admins can update members" on public.space_members;
create policy "Admins can update members" on public.space_members
  for update
  using (
    exists (
      select 1
      from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
    and user_id <> auth.uid()
  );

-- ── messages ───────────────────────────────────────────────────────────────────

drop policy if exists "Members can read space messages" on public.messages;
create policy "Members can read space messages" on public.messages
  for select
  using (
    exists (
      select 1
      from public.space_members m
      where m.space_id = messages.space_id
        and m.user_id = auth.uid()
        and coalesce(m.blacklisted, false) = false
    )
    and (
      type != 'whisper'
      or sender_id = auth.uid()
      or target_user_id = auth.uid()
    )
  );

drop policy if exists "Admins can delete all messages" on public.messages;
create policy "Admins can delete all messages" on public.messages
  for delete
  using (
    exists (
      select 1
      from public.spaces s
      where s.id = messages.space_id
        and s.owner_id = auth.uid()
    )
  );

commit;