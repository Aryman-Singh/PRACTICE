-- Daymark tasks table for the fahhh1 API.
-- Run this in the Supabase SQL editor for project xiaqrzpf:
-- https://supabase.com/dashboard/project/xiaqrzpf/sql/new

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint tasks_description_length check (char_length(description) <= 500)
);

create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_tasks_updated_at();

alter table public.tasks enable row level security;

-- The Express API uses the service role key, which bypasses row level security.
-- No anon or authenticated policies are created, so the table stays private.
