-- Harden space admin handling and repair existing bad membership rows.
-- Run this in the Supabase SQL editor.

begin;

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

-- Make sure every space owner has a visible admin membership row.
insert into public.space_members (space_id, user_id, role, blacklisted)
select s.id, s.owner_id, 'admin', false
from public.spaces s
on conflict (space_id, user_id)
do update set role = 'admin', blacklisted = false;

-- Demote forged/admin-by-join rows. Admin authority comes from spaces.owner_id.
update public.space_members sm
set role = 'member'
from public.spaces s
where sm.space_id = s.id
  and sm.user_id <> s.owner_id
  and sm.role = 'admin';

drop policy if exists "Users can insert self" on public.space_members;
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

drop policy if exists "Admins can update members" on public.space_members;
create policy "Admins can update members" on public.space_members
  for update
  using (public.is_space_admin(space_id, auth.uid()))
  with check (
    public.is_space_admin(space_id, auth.uid())
    and user_id <> auth.uid()
  );

drop policy if exists "Users can delete self" on public.space_members;
create policy "Users can delete self" on public.space_members
  for delete
  using (
    user_id = auth.uid()
    and not public.is_space_admin(space_id, auth.uid())
  );

drop policy if exists "Owners can delete members" on public.space_members;
create policy "Owners can delete members" on public.space_members
  for delete
  using (
    public.is_space_admin(space_id, auth.uid())
    and user_id <> auth.uid()
  );

commit;
