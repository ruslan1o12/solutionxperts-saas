-- SolutionXperts schema
-- Safe to re-run any time (every statement is idempotent) — paste the whole
-- file into Supabase SQL Editor and hit Run after any update.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  role text default 'technician', -- admin | salesman | technician
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
  due_date date,
  paid_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- columns added after the first release — safe no-ops if they already exist
alter table public.quotes add column if not exists due_date date;
alter table public.quotes add column if not exists paid_at timestamptz;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  assigned_to uuid references auth.users(id),
  scheduled_at timestamptz,
  status text not null default 'Scheduled', -- Scheduled | On The Way | Arrived | Completed | Cancelled
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- One-time bootstrap: anyone with the old default role becomes admin so the
-- first user (you) doesn't get locked out when roles are introduced.
update public.profiles set role = 'admin' where role = 'employee' or role is null;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_notes enable row level security;
alter table public.door_logs enable row level security;
alter table public.quotes enable row level security;
alter table public.jobs enable row level security;

drop policy if exists "team read profiles" on public.profiles;
create policy "team read profiles" on public.profiles for select using (auth.role() = 'authenticated');
drop policy if exists "self insert profile" on public.profiles;
create policy "self insert profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "admin update roles" on public.profiles;
create policy "admin update roles" on public.profiles for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

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

-- Jobs: technicians only see/update jobs assigned to them; admins/salesmen see everything.
drop policy if exists "job select" on public.jobs;
create policy "job select" on public.jobs for select using (
  assigned_to = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
);
drop policy if exists "job insert" on public.jobs;
create policy "job insert" on public.jobs for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
);
drop policy if exists "job update" on public.jobs;
create policy "job update" on public.jobs for update using (
  assigned_to = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
);
drop policy if exists "job delete" on public.jobs;
create policy "job delete" on public.jobs for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
);

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
