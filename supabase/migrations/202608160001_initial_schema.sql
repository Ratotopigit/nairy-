create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'provider', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null default 'Presentation',
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists feed_posts_created_at_idx on public.feed_posts(created_at desc);
create index if not exists post_comments_post_id_idx on public.post_comments(post_id, created_at);
create index if not exists presentation_briefs_owner_id_idx on public.presentation_briefs(owner_id, updated_at desc);
create index if not exists buyer_blueprints_owner_id_idx on public.buyer_blueprints(owner_id, created_at desc);
create index if not exists presentations_owner_id_idx on public.presentations(owner_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.feed_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.presentation_briefs enable row level security;
alter table public.buyer_blueprints enable row level security;
alter table public.presentations enable row level security;

create policy "Users can read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Authenticated users can read feed posts" on public.feed_posts
  for select to authenticated using (true);
create policy "Users can create feed posts" on public.feed_posts
  for insert to authenticated with check (auth.uid() = author_id);
create policy "Users can update their feed posts" on public.feed_posts
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users can delete their feed posts" on public.feed_posts
  for delete to authenticated using (auth.uid() = author_id);

create policy "Authenticated users can read likes" on public.post_likes
  for select to authenticated using (true);
create policy "Users can create likes" on public.post_likes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can remove their likes" on public.post_likes
  for delete to authenticated using (auth.uid() = user_id);

create policy "Authenticated users can read comments" on public.post_comments
  for select to authenticated using (true);
create policy "Users can create comments" on public.post_comments
  for insert to authenticated with check (auth.uid() = author_id);
create policy "Users can update their comments" on public.post_comments
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users can delete their comments" on public.post_comments
  for delete to authenticated using (auth.uid() = author_id);

create policy "Users own presentation briefs" on public.presentation_briefs
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users own buyer blueprints" on public.buyer_blueprints
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users own presentations" on public.presentations
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
