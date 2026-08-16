create table if not exists public.workspace_memory (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  onboarding_complete boolean not null default false,
  business_profile jsonb not null default '{}'::jsonb,
  audience_profile jsonb not null default '{}'::jsonb,
  offer_profile jsonb not null default '{}'::jsonb,
  brand_profile jsonb not null default '{}'::jsonb,
  creation_preferences jsonb not null default '{}'::jsonb,
  memory_summary text not null default '',
  source_session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New creation',
  intent text not null default 'discover' check (intent in ('discover', 'avatar', 'offer', 'ideas', 'presentation', 'content')),
  status text not null default 'draft' check (status in ('draft', 'working', 'completed', 'failed')),
  messages jsonb not null default '[]'::jsonb,
  brief jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  byte_size bigint not null default 0 check (byte_size >= 0),
  asset_type text not null default 'reference' check (asset_type in ('logo', 'photo', 'reference', 'document', 'video')),
  palette jsonb,
  background_removed_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_sessions_owner_updated_idx
  on public.assistant_sessions(owner_id, updated_at desc);
create index if not exists workspace_assets_owner_created_idx
  on public.workspace_assets(owner_id, created_at desc);

alter table public.workspace_memory enable row level security;
alter table public.assistant_sessions enable row level security;
alter table public.workspace_assets enable row level security;

grant select, insert, update, delete on public.workspace_memory,
  public.assistant_sessions, public.workspace_assets to authenticated;
revoke all on public.workspace_memory, public.assistant_sessions,
  public.workspace_assets from anon;

drop policy if exists "Users own workspace memory" on public.workspace_memory;
create policy "Users own workspace memory" on public.workspace_memory
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own assistant sessions" on public.assistant_sessions;
create policy "Users own assistant sessions" on public.assistant_sessions
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own workspace assets" on public.workspace_assets;
create policy "Users own workspace assets" on public.workspace_assets
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-assets',
  'workspace-assets',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
on conflict (id) do nothing;

drop policy if exists "Users can read their workspace asset files" on storage.objects;
create policy "Users can read their workspace asset files" on storage.objects
  for select to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can upload their workspace asset files" on storage.objects;
create policy "Users can upload their workspace asset files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can update their workspace asset files" on storage.objects;
create policy "Users can update their workspace asset files" on storage.objects
  for update to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can delete their workspace asset files" on storage.objects;
create policy "Users can delete their workspace asset files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
