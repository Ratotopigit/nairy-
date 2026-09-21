-- Matches the table shape used by n8n's Postgres Chat Memory node.
create table if not exists public.n8n_chat_histories (
  id bigserial primary key,
  session_id text not null,
  message jsonb not null
);

create index if not exists n8n_chat_histories_session_idx
  on public.n8n_chat_histories(session_id, id);

-- Memory is only for n8n's direct Postgres credential, never the Data API.
revoke all on table public.n8n_chat_histories from anon, authenticated;
revoke all on sequence public.n8n_chat_histories_id_seq from anon, authenticated;
alter table public.n8n_chat_histories enable row level security;
