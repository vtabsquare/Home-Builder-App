create table if not exists public.elevation_images (
  id uuid primary key default gen_random_uuid(),
  preset_key text not null,
  image_path text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.elevation_images enable row level security;

create policy "Anyone can read elevation images"
  on public.elevation_images for select
  to anon, authenticated
  using (char_length(preset_key) between 1 and 200);

create policy "Anyone can insert elevation images"
  on public.elevation_images for insert
  to anon, authenticated
  with check (
    char_length(preset_key) between 1 and 200
    and char_length(image_path) between 1 and 500
    and char_length(image_url) between 1 and 2000
  );

create policy "Anyone can delete elevation images"
  on public.elevation_images for delete
  to anon, authenticated
  using (char_length(preset_key) between 1 and 200);
