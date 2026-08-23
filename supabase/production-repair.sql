-- Safe to run repeatedly in the Supabase SQL Editor.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'provider', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;

create table if not exists public.presentation_briefs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled brief',
  business jsonb not null default '{}'::jsonb,
  audience jsonb not null default '{}'::jsonb,
  problem jsonb not null default '{}'::jsonb,
  objection jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buyer_blueprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  brief_id uuid references public.presentation_briefs(id) on delete set null,
  persona_name text not null,
  blueprint jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  brief_id uuid references public.presentation_briefs(id) on delete set null,
  title text not null default 'Untitled presentation',
  slides jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.content_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
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
  asset_role text not null default 'reference' check (asset_role in ('logo', 'brand_photo', 'product', 'background', 'document', 'reference')),
  palette jsonb,
  background_removed_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.n8n_chat_histories (
  id bigserial primary key,
  session_id text not null,
  message jsonb not null
);

alter table public.workspace_assets
  add column if not exists asset_role text not null default 'reference'
  check (asset_role in ('logo', 'brand_photo', 'product', 'background', 'document', 'reference'));

create index if not exists presentation_briefs_owner_id_idx on public.presentation_briefs(owner_id, updated_at desc);
create index if not exists buyer_blueprints_owner_id_idx on public.buyer_blueprints(owner_id, created_at desc);
create index if not exists presentations_owner_id_idx on public.presentations(owner_id, updated_at desc);
create index if not exists blueprint_sessions_owner_updated_idx on public.blueprint_sessions(owner_id, updated_at desc);
create unique index if not exists blueprint_sessions_owner_session_key on public.blueprint_sessions(owner_id, session_id);
create index if not exists content_sessions_owner_updated_idx on public.content_sessions(owner_id, updated_at desc);
create index if not exists content_sessions_blueprint_idx on public.content_sessions(blueprint_session_id, updated_at desc);
alter table public.content_sessions drop constraint if exists content_sessions_project_id_key;
create unique index if not exists content_sessions_owner_project_key on public.content_sessions(owner_id, project_id);
create index if not exists assistant_sessions_owner_updated_idx on public.assistant_sessions(owner_id, updated_at desc);
create index if not exists workspace_assets_owner_created_idx on public.workspace_assets(owner_id, created_at desc);
create index if not exists workspace_assets_owner_role_created_idx on public.workspace_assets(owner_id, asset_role, created_at desc);
create index if not exists n8n_chat_histories_session_idx on public.n8n_chat_histories(session_id, id);

alter table public.profiles enable row level security;
alter table public.presentation_briefs enable row level security;
alter table public.buyer_blueprints enable row level security;
alter table public.presentations enable row level security;
alter table public.blueprint_sessions enable row level security;
alter table public.content_sessions enable row level security;
alter table public.workspace_memory enable row level security;
alter table public.assistant_sessions enable row level security;
alter table public.workspace_assets enable row level security;
alter table public.n8n_chat_histories enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.presentation_briefs,
  public.buyer_blueprints, public.presentations, public.blueprint_sessions,
  public.content_sessions, public.workspace_memory, public.assistant_sessions,
  public.workspace_assets to authenticated;
revoke all on public.profiles, public.presentation_briefs, public.buyer_blueprints,
  public.presentations, public.blueprint_sessions, public.content_sessions,
  public.workspace_memory, public.assistant_sessions, public.workspace_assets from anon;
revoke all on public.n8n_chat_histories from anon, authenticated;
revoke all on sequence public.n8n_chat_histories_id_seq from anon, authenticated;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "Users own presentation briefs" on public.presentation_briefs;
create policy "Users own presentation briefs" on public.presentation_briefs for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own buyer blueprints" on public.buyer_blueprints;
create policy "Users own buyer blueprints" on public.buyer_blueprints for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own presentations" on public.presentations;
create policy "Users own presentations" on public.presentations for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own blueprint sessions" on public.blueprint_sessions;
create policy "Users own blueprint sessions" on public.blueprint_sessions for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own content sessions" on public.content_sessions;
create policy "Users own content sessions" on public.content_sessions for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own workspace memory" on public.workspace_memory;
create policy "Users own workspace memory" on public.workspace_memory for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own assistant sessions" on public.assistant_sessions;
create policy "Users own assistant sessions" on public.assistant_sessions for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "Users own workspace assets" on public.workspace_assets;
create policy "Users own workspace assets" on public.workspace_assets for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-assets', 'workspace-assets', false, 52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf',
    'text/plain', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their workspace asset files" on storage.objects;
create policy "Users can read their workspace asset files" on storage.objects for select to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can upload their workspace asset files" on storage.objects;
create policy "Users can upload their workspace asset files" on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can update their workspace asset files" on storage.objects;
create policy "Users can update their workspace asset files" on storage.objects for update to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users can delete their workspace asset files" on storage.objects;
create policy "Users can delete their workspace asset files" on storage.objects for delete to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

notify pgrst, 'reload schema';
