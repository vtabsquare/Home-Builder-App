create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  timeline text,
  config jsonb not null default '{}'::jsonb,
  total_cost numeric,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Public form: anyone can submit a lead
create policy "Anyone can insert leads"
  on public.leads for insert
  to anon, authenticated
  with check (
    char_length(name) between 1 and 100
    and char_length(email) between 3 and 255
    and char_length(phone) between 3 and 30
  );

-- Leads are private otherwise (no select/update/delete policy = no access)
