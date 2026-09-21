insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-assets',
  'workspace-assets',
  false,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

create or replace function public.ensure_workspace_assets_bucket()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'workspace-assets',
    'workspace-assets',
    false,
    52428800,
    array[
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  )
  on conflict (id) do update set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  return jsonb_build_object('ok', true, 'bucket', 'workspace-assets');
end;
$$;

revoke all on function public.ensure_workspace_assets_bucket() from public, anon;
grant execute on function public.ensure_workspace_assets_bucket() to authenticated;
