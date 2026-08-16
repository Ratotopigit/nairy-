-- Keep session history private while exposing the table to signed-in API clients.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.blueprint_sessions to authenticated;
revoke all on table public.blueprint_sessions from anon;

alter table public.blueprint_sessions enable row level security;

drop policy if exists "Users own blueprint sessions" on public.blueprint_sessions;
create policy "Users own blueprint sessions"
  on public.blueprint_sessions
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
