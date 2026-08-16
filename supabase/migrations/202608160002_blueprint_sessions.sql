create table if not exists public.blueprint_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'generating', 'completed', 'failed')),
  step integer not null default -1 check (step between -1 and 4),
  answers jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  draft text not null default '',
  selected_category text,
  blueprint jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blueprint_sessions_owner_updated_idx
  on public.blueprint_sessions(owner_id, updated_at desc);

alter table public.blueprint_sessions enable row level security;

create policy "Users own blueprint sessions" on public.blueprint_sessions
  for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

