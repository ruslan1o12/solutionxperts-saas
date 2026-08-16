-- SolutionXperts schema
-- Safe to re-run any time (every statement is idempotent) — paste the whole
-- file into Supabase SQL Editor and hit Run after any update.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  email text,
  phone text,
  role text default 'technician', -- admin | salesman | technician
  created_at timestamptz default now()
);

-- columns added after the first release — safe no-ops if they already exist
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;

-- backfill email for accounts created before this column existed
update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

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
  status text not null default 'Scheduled', -- Scheduled | On The Way | Arrived | In Progress | Completed | Cancelled
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.rate_card (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  unit text not null default 'job', -- e.g. sqft, hour, job
  low_price numeric not null default 0,
  high_price numeric not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

insert into public.rate_card (service_name, unit, low_price, high_price, notes)
select * from (values
  ('Handyman labor', 'hour', 55, 85, 'General repairs, no specialty materials'),
  ('Interior/exterior cleaning', 'sqft', 0.15, 0.35, 'Standard residential clean'),
  ('Pothole repair', 'sqft', 8, 18, 'Cold patch to hot mix depending on depth'),
  ('Road/lot resurfacing', 'sqft', 2.50, 5.50, 'Sealcoating and minor resurfacing')
) as v(service_name, unit, low_price, high_price, notes)
where not exists (select 1 from public.rate_card);

create table if not exists public.work_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  work_date date not null default current_date,
  started_at timestamptz,
  ended_at timestamptz,
  doors_knocked int,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, work_date)
);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  phase text not null, -- 'before' | 'after'
  storage_path text not null,
  ai_verified boolean default false,
  ai_note text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.job_photos add column if not exists ai_verified boolean default false;
alter table public.job_photos add column if not exists ai_note text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users(id) not null,
  title text not null,
  message text,
  job_id uuid references public.jobs(id) on delete set null,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.theme_settings (
  id int primary key default 1,
  logo_url text,
  font_family text default 'system',
  primary_color text default '#3D8B4C',
  ink_color text default '#1B4332',
  updated_at timestamptz default now(),
  constraint single_row_theme check (id = 1)
);
insert into public.theme_settings (id) values (1) on conflict (id) do nothing;

-- Public bucket for branding assets (logo needs to be visible everywhere, including on login before auth)
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null default 'General',
  amount numeric not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.business_settings (
  id int primary key default 1,
  legal_name text default 'SolutionXperts Property Improvement',
  tax_number text,
  business_number text,
  address text,
  phone text,
  email text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into public.business_settings (id) values (1) on conflict (id) do nothing;

-- Private storage bucket for before/after job photos (not publicly readable)
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', false)
on conflict (id) do nothing;

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
alter table public.rate_card enable row level security;
alter table public.work_days enable row level security;
alter table public.job_photos enable row level security;
alter table public.expenses enable row level security;
alter table public.business_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.theme_settings enable row level security;

drop policy if exists "team read profiles" on public.profiles;
create policy "team read profiles" on public.profiles for select using (auth.role() = 'authenticated');
drop policy if exists "self insert profile" on public.profiles;
create policy "self insert profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "admin update roles" on public.profiles;
create policy "admin update roles" on public.profiles for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "self update own profile" on public.profiles;
create policy "self update own profile" on public.profiles for update using (id = auth.uid());

-- Users can edit their own name/phone, but not their own role — a trigger silently
-- reverts any role change that didn't come from an admin, so the "self update"
-- policy above can't be used to self-promote.
create or replace function public.prevent_self_role_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists prevent_role_escalation on public.profiles;
create trigger prevent_role_escalation before update on public.profiles
for each row execute procedure public.prevent_self_role_escalation();

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

-- Rate card: everyone signed in can read it (salesmen need it while estimating),
-- only admins can change the actual prices.
drop policy if exists "rate card read" on public.rate_card;
create policy "rate card read" on public.rate_card for select using (auth.role() = 'authenticated');
drop policy if exists "rate card admin write" on public.rate_card;
create policy "rate card admin write" on public.rate_card for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Work days: everyone manages their own day log; admins/salesmen can also read
-- everyone's, for the Team Activity report.
drop policy if exists "own day log" on public.work_days;
create policy "own day log" on public.work_days for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "office read all day logs" on public.work_days;
create policy "office read all day logs" on public.work_days for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
);

-- Job photos: anyone signed in can upload (technicians included); admins can read
-- everything, and an uploader can see their own rows' metadata (not the image
-- bytes — actual photo access is still gated by the storage policy below).
drop policy if exists "job photos insert" on public.job_photos;
create policy "job photos insert" on public.job_photos for insert with check (auth.role() = 'authenticated');
drop policy if exists "job photos admin select" on public.job_photos;
create policy "job photos admin select" on public.job_photos for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "job photos own metadata select" on public.job_photos;
create policy "job photos own metadata select" on public.job_photos for select using (
  uploaded_by = auth.uid()
);
drop policy if exists "job photos update" on public.job_photos;
create policy "job photos update" on public.job_photos for update using (
  uploaded_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "job photos admin delete" on public.job_photos;
create policy "job photos admin delete" on public.job_photos for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Expenses: admin only, end to end.
drop policy if exists "expenses admin all" on public.expenses;
create policy "expenses admin all" on public.expenses for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Business settings: everyone signed in can read (needed to generate invoice PDFs),
-- only admins can edit.
drop policy if exists "business settings read" on public.business_settings;
create policy "business settings read" on public.business_settings for select using (auth.role() = 'authenticated');
drop policy if exists "business settings admin write" on public.business_settings;
create policy "business settings admin write" on public.business_settings for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Notifications: anyone signed in can create one (e.g. a tech notifying admins),
-- but you can only read/update your own.
drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert" on public.notifications for insert with check (auth.role() = 'authenticated');
drop policy if exists "notifications own select" on public.notifications;
create policy "notifications own select" on public.notifications for select using (recipient_id = auth.uid());
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications for update using (recipient_id = auth.uid());

-- Messages: shared team channel, everyone signed in can read and post.
drop policy if exists "messages read" on public.messages;
create policy "messages read" on public.messages for select using (auth.role() = 'authenticated');
drop policy if exists "messages insert" on public.messages;
create policy "messages insert" on public.messages for insert with check (auth.role() = 'authenticated' and sender_id = auth.uid());

-- Theme settings: everyone can read (so the whole site can style itself),
-- only admins can change branding.
drop policy if exists "theme read" on public.theme_settings;
create policy "theme read" on public.theme_settings for select using (true);
drop policy if exists "theme admin write" on public.theme_settings;
create policy "theme admin write" on public.theme_settings for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Storage: branding bucket is public to read (logo shows on the login page,
-- before anyone is authenticated); only admins can upload/replace it.
drop policy if exists "branding public read" on storage.objects;
create policy "branding public read" on storage.objects for select using (bucket_id = 'branding');
drop policy if exists "branding admin write" on storage.objects;
create policy "branding admin write" on storage.objects for insert with check (
  bucket_id = 'branding'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "branding admin update" on storage.objects;
create policy "branding admin update" on storage.objects for update using (
  bucket_id = 'branding'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Enable live updates for the team chat
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Storage: anyone signed in can upload into job-photos; only admins can read/list/delete.
drop policy if exists "job photos storage insert" on storage.objects;
create policy "job photos storage insert" on storage.objects for insert
  with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');
drop policy if exists "job photos storage admin select" on storage.objects;
create policy "job photos storage admin select" on storage.objects for select using (
  bucket_id = 'job-photos'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "job photos storage admin delete" on storage.objects;
create policy "job photos storage admin delete" on storage.objects for delete using (
  bucket_id = 'job-photos'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
