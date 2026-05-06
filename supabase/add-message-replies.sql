-- Add reply_to column to messages table.

begin;

alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;

commit;
