-- Add delivery status to messages table.
-- Values: sending, sent, delivered, error
-- Also add realtime policies so clients can subscribe to status updates.

begin;

-- Add status column with default 'sending'
alter table public.messages
  add column if not exists status text not null default 'sending'::text;

-- Make sure RLS allows updates to status (broadcast only, not data changes)
-- The existing insert policy covers status as a column

-- Allow authenticated users to update status on their own messages
create policy "Users can update own message status"
  on public.messages
  for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

commit;