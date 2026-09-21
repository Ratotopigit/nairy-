create table if not exists public.content_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  blueprint_session_id uuid references public.blueprint_sessions(session_id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'generating', 'completed', 'failed')),
  title text not null default 'Untitled presentation',
  brief jsonb not null default '{}'::jsonb,
  slides jsonb not null default '[]'::jsonb check (jsonb_typeof(slides) = 'array'),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array'),
  theme jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_sessions_owner_updated_idx
  on public.content_sessions(owner_id, updated_at desc);

create index if not exists content_sessions_blueprint_idx
  on public.content_sessions(blueprint_session_id, updated_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.content_sessions to authenticated;
revoke all on table public.content_sessions from anon;

alter table public.content_sessions enable row level security;

drop policy if exists "Users own content sessions" on public.content_sessions;
create policy "Users own content sessions"
  on public.content_sessions
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- The auth trigger can invoke this function; API roles should not call it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
