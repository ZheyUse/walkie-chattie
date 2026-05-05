-- Allow authenticated users to lookup spaces by id (join flow)
create policy "Authenticated can read spaces" on public.spaces
  for select using (auth.role() = 'authenticated');
