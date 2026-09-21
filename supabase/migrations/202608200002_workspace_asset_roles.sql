alter table public.workspace_assets
  add column if not exists asset_role text not null default 'reference'
  check (asset_role in ('logo', 'brand_photo', 'product', 'background', 'document', 'reference'));

create index if not exists workspace_assets_owner_role_created_idx
  on public.workspace_assets(owner_id, asset_role, created_at desc);
