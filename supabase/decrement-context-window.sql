-- Decrement context window when messages are deleted
create or replace function public.decrement_context_window()
returns trigger language plpgsql as $$
begin
  update public.spaces
  set context_window_used = greatest(context_window_used - 1, 0)
  where id = OLD.space_id;
  return OLD;
end;
$$;

drop trigger if exists on_message_delete on public.messages;
create trigger on_message_delete
  after delete on public.messages
  for each row execute function public.decrement_context_window();
