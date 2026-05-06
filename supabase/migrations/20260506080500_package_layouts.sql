create table if not exists public.package_layouts (
  package_key text primary key,
  plan_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.package_layouts enable row level security;

create policy "Anyone can read package layouts"
  on public.package_layouts for select
  to anon, authenticated
  using (true);

create policy "Anyone can upsert package layouts"
  on public.package_layouts for insert
  to anon, authenticated
  with check (char_length(package_key) between 1 and 100);

create policy "Anyone can update package layouts"
  on public.package_layouts for update
  to anon, authenticated
  using (char_length(package_key) between 1 and 100)
  with check (char_length(package_key) between 1 and 100);
