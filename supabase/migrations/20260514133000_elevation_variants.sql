create table if not exists public.elevation_variants (
  id uuid primary key default gen_random_uuid(),
  variant_signature text not null unique,
  legacy_preset_key text unique,
  home_type text,
  bedrooms integer,
  bathrooms integer,
  kitchen text,
  is_double_storey boolean,
  roof text,
  material text,
  visual_addons text[] not null default '{}'::text[],
  preset_id integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.elevation_variants enable row level security;

create policy "Anyone can read elevation variants"
  on public.elevation_variants for select
  to anon, authenticated
  using (char_length(variant_signature) between 1 and 255);

create policy "Anyone can insert elevation variants"
  on public.elevation_variants for insert
  to anon, authenticated
  with check (char_length(variant_signature) between 1 and 255);

create policy "Anyone can update elevation variants"
  on public.elevation_variants for update
  to anon, authenticated
  using (char_length(variant_signature) between 1 and 255)
  with check (char_length(variant_signature) between 1 and 255);

alter table public.elevation_images
  add column if not exists variant_id uuid references public.elevation_variants(id) on delete set null;

create index if not exists elevation_images_variant_id_idx on public.elevation_images(variant_id);
create index if not exists elevation_variants_legacy_preset_key_idx on public.elevation_variants(legacy_preset_key);
create index if not exists elevation_variants_family_lookup_idx
  on public.elevation_variants(home_type, bedrooms, bathrooms, kitchen, is_double_storey, preset_id);

with parsed_elevation_variants as (
  select distinct
    ei.preset_key as legacy_preset_key,
    (
      regexp_match(
        ei.preset_key,
        '^__elevation_variant__([^_]+)_([0-9]+)bed_([0-9]+)bath_([^_]+)_(single|double)_roof_([^_]+)_material_([^_]+)_addons_(.+)_([0-9]+)$'
      )
    ) as matches
  from public.elevation_images ei
  where ei.preset_key like '__elevation_variant__%'
), normalized_elevation_variants as (
  select
    legacy_preset_key,
    matches[1] as home_type,
    matches[2]::integer as bedrooms,
    matches[3]::integer as bathrooms,
    matches[4] as kitchen,
    (matches[5] = 'double') as is_double_storey,
    matches[6] as roof,
    matches[7] as material,
    case
      when matches[8] = 'none' then '{}'::text[]
      else string_to_array(matches[8], '-')
    end as visual_addons,
    matches[9]::integer as preset_id
  from parsed_elevation_variants
  where matches is not null
), inserted_elevation_variants as (
  insert into public.elevation_variants (
    variant_signature,
    legacy_preset_key,
    home_type,
    bedrooms,
    bathrooms,
    kitchen,
    is_double_storey,
    roof,
    material,
    visual_addons,
    preset_id
  )
  select
    concat(
      'v1|',
      home_type,
      '|', bedrooms, 'bed',
      '|', bathrooms, 'bath',
      '|', kitchen,
      '|', case when is_double_storey then 'double' else 'single' end,
      '|', roof,
      '|', material,
      '|', case
             when visual_addons is null or cardinality(visual_addons) = 0 then 'none'
             else array_to_string(visual_addons, ',')
           end,
      '|', preset_id
    ) as variant_signature,
    legacy_preset_key,
    home_type,
    bedrooms,
    bathrooms,
    kitchen,
    is_double_storey,
    roof,
    material,
    visual_addons,
    preset_id
  from normalized_elevation_variants
  on conflict (variant_signature) do update
  set legacy_preset_key = excluded.legacy_preset_key,
      updated_at = now()
  returning id, legacy_preset_key
), parsed_builtin_variants as (
  select distinct
    ei.preset_key as legacy_preset_key,
    (
      regexp_match(
        ei.preset_key,
        '^__builtin_floor_plan__([^_]+)_([0-9]+)bed_([0-9]+)bath_([^_]+)_(single|double)_addons_(.+)_([0-9]+)$'
      )
    ) as matches
  from public.elevation_images ei
  where ei.preset_key like '__builtin_floor_plan__%'
), normalized_builtin_variants as (
  select
    legacy_preset_key,
    matches[1] as home_type,
    matches[2]::integer as bedrooms,
    matches[3]::integer as bathrooms,
    matches[4] as kitchen,
    (matches[5] = 'double') as is_double_storey,
    'gable'::text as roof,
    'modern'::text as material,
    case
      when matches[6] = 'none' then '{}'::text[]
      else string_to_array(matches[6], '-')
    end as visual_addons,
    matches[7]::integer as preset_id,
    concat(
      'v1|',
      matches[1],
      '|', matches[2], 'bed',
      '|', matches[3], 'bath',
      '|', matches[4],
      '|', matches[5],
      '|gable|modern|',
      case
        when matches[6] = 'none' then 'none'
        else replace(matches[6], '-', ',')
      end,
      '|', matches[7]
    ) as variant_signature
  from parsed_builtin_variants
  where matches is not null
), inserted_builtin_variants as (
  insert into public.elevation_variants (
    variant_signature,
    legacy_preset_key,
    home_type,
    bedrooms,
    bathrooms,
    kitchen,
    is_double_storey,
    roof,
    material,
    visual_addons,
    preset_id
  )
  select
    variant_signature,
    legacy_preset_key,
    home_type,
    bedrooms,
    bathrooms,
    kitchen,
    is_double_storey,
    roof,
    material,
    visual_addons,
    preset_id
  from normalized_builtin_variants
  on conflict (variant_signature) do nothing
  returning id, legacy_preset_key
), updated_builtin_legacy_keys as (
  update public.elevation_variants ev
  set legacy_preset_key = nb.legacy_preset_key,
      updated_at = now()
  from normalized_builtin_variants nb
  where ev.variant_signature = nb.variant_signature
    and ev.legacy_preset_key is null
  returning ev.id, ev.legacy_preset_key
), linked_by_legacy_key as (
  update public.elevation_images ei
  set variant_id = ev.id
  from public.elevation_variants ev
  where ei.variant_id is null
    and ei.preset_key = ev.legacy_preset_key
  returning ei.id
), parsed_builtin_images as (
  select
    ei.id as image_id,
    concat(
      'v1|',
      matches[1],
      '|', matches[2], 'bed',
      '|', matches[3], 'bath',
      '|', matches[4],
      '|', matches[5],
      '|gable|modern|',
      case
        when matches[6] = 'none' then 'none'
        else replace(matches[6], '-', ',')
      end,
      '|', matches[7]
    ) as variant_signature
  from public.elevation_images ei
  cross join lateral regexp_match(
    ei.preset_key,
    '^__builtin_floor_plan__([^_]+)_([0-9]+)bed_([0-9]+)bath_([^_]+)_(single|double)_addons_(.+)_([0-9]+)$'
  ) as matches
  where ei.variant_id is null
    and ei.preset_key like '__builtin_floor_plan__%'
)
update public.elevation_images ei
set variant_id = ev.id
from parsed_builtin_images pbi
join public.elevation_variants ev
  on ev.variant_signature = pbi.variant_signature
where ei.id = pbi.image_id
  and ei.variant_id is null;
