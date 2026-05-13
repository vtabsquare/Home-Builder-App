-- Allow reading leads for admin panel
create policy "Anyone can read leads"
  on public.leads for select
  to anon, authenticated
  using (true);

-- Allow deleting leads for admin panel
create policy "Anyone can delete leads"
  on public.leads for delete
  to anon, authenticated
  using (true);

-- Admin settings key-value store for pricing config
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

create policy "Anyone can read admin settings"
  on public.admin_settings for select
  to anon, authenticated
  using (true);

create policy "Anyone can insert admin settings"
  on public.admin_settings for insert
  to anon, authenticated
  with check (char_length(key) between 1 and 100);

create policy "Anyone can update admin settings"
  on public.admin_settings for update
  to anon, authenticated
  using (char_length(key) between 1 and 100)
  with check (char_length(key) between 1 and 100);

create policy "Anyone can delete admin settings"
  on public.admin_settings for delete
  to anon, authenticated
  using (true);
