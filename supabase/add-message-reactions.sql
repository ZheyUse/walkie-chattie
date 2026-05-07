-- Add reactions column to messages table.
-- Store as JSONB array: [{ emoji: "👍", user_ids: ["uuid", ...] }]
--
-- IMPORTANT: Uses is_space_member() SECURITY DEFINER function from fix-space-members-rls.sql
-- to avoid infinite RLS recursion. Do not use direct exists subqueries on space_members.

begin;

alter table public.messages
  add column if not exists reactions jsonb not null default '[]'::jsonb;

drop policy if exists "Users can update message reactions" on public.messages;

create policy "Users can update message reactions" on public.messages
  for update
  using (
    auth.role() = 'authenticated'
    and public.is_space_member(space_id, auth.uid())
  )
  with check (
    auth.role() = 'authenticated'
    and public.is_space_member(space_id, auth.uid())
  );

commit;