-- Add reactions column to messages table.
-- Store as JSONB array: [{ emoji: "642", user_ids: ["uuid", ...] }]

begin;

alter table public.messages
  add column if not exists reactions jsonb not null default '[]'::jsonb;

create policy "Users can update message reactions"
  on public.messages
  for update
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.space_members sm
      where sm.space_id = messages.space_id
        and sm.user_id = auth.uid()
        and sm.blacklisted = false
    )
  )
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.space_members sm
      where sm.space_id = messages.space_id
        and sm.user_id = auth.uid()
        and sm.blacklisted = false
    )
  );

commit;
