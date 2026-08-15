-- SolutionXperts schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  role text default 'employee',
  created_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  address text,
  service_type text default 'Handyman',
  status text default 'New',
  follow_up date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.door_logs (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  outcome text not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  line_items jsonb not null default '[]',
  tax_rate numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'Draft', -- Draft | Sent | Paid
  stripe_payment_link text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Row Level Security: any signed-in team member can read/write shared company data.
-- (Up to 30 users all see the same book of business, like Homebase.)
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_notes enable row level security;
alter table public.door_logs enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "team read profiles" on public.profiles;
create policy "team read profiles" on public.profiles for select using (auth.role() = 'authenticated');
drop policy if exists "self insert profile" on public.profiles;
create policy "self insert profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "team all customers" on public.customers;
create policy "team all customers" on public.customers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "team all notes" on public.customer_notes;
create policy "team all notes" on public.customer_notes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "team all doorlogs" on public.door_logs;
create policy "team all doorlogs" on public.door_logs for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "team all quotes" on public.quotes;
create policy "team all quotes" on public.quotes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
