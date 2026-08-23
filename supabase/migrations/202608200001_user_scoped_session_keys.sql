create unique index if not exists blueprint_sessions_owner_session_key
  on public.blueprint_sessions(owner_id, session_id);

alter table public.content_sessions
  drop constraint if exists content_sessions_project_id_key;

create unique index if not exists content_sessions_owner_project_key
  on public.content_sessions(owner_id, project_id);
