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
alter table public.profiles add column if not exists photo_gate_enabled boolean default true;
alter table public.profiles add column if not exists ai_estimator_enabled boolean default true;

-- backfill email for accounts created before this column existed
update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  address text,
  lat double precision,
  lng double precision,
  service_type text default 'Handyman',
  status text default 'New',
  follow_up date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.customers add column if not exists lat double precision;
alter table public.customers add column if not exists lng double precision;

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
alter table public.quotes add column if not exists public_token uuid default gen_random_uuid();
alter table public.quotes add column if not exists description text;
alter table public.quotes add column if not exists approval_status text default 'Pending'; -- Pending | Accepted | Declined
alter table public.quotes add column if not exists approved_at timestamptz;
alter table public.quotes add column if not exists salesman_id uuid references auth.users(id);
create unique index if not exists quotes_public_token_idx on public.quotes(public_token);

-- Profiles: per-employee pay setup, used by the payroll/commission report.
alter table public.profiles add column if not exists commission_rate numeric default 0; -- % of sale, for salesmen
alter table public.profiles add column if not exists pay_type text default 'hourly'; -- hourly | daily | percentage | flat
alter table public.profiles add column if not exists pay_rate numeric default 0;

-- Work days: doors_knocked becomes a running total built from +/- taps with a
-- quick note each, instead of a single number you overwrite.
alter table public.work_days add column if not exists door_events jsonb default '[]';

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  assigned_to uuid references auth.users(id),
  sold_by uuid references auth.users(id),
  scheduled_at timestamptz,
  duration_minutes int default 60,
  job_description text,
  status text not null default 'Scheduled', -- Scheduled | On The Way | Arrived | In Progress | Completed | Cancelled
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.jobs add column if not exists sold_by uuid references auth.users(id);
alter table public.jobs add column if not exists duration_minutes int default 60;
alter table public.jobs add column if not exists job_description text;

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

-- Recalibrated to realistic Ontario, Canada small-contractor pricing (was
-- generic placeholder numbers). Only updates rows that still have their
-- original default name/price — if you've already customized these in
-- Settings → Rate Card, your numbers are left alone.
update public.rate_card set unit = 'hour', low_price = 65, high_price = 95,
  notes = 'General repairs, no specialty materials'
where service_name = 'Handyman labor' and low_price = 55 and high_price = 85;

update public.rate_card set service_name = 'House cleaning (interior)', unit = 'sqft',
  low_price = 0.10, high_price = 0.20, notes = 'Standard residential clean, per visit'
where service_name = 'Interior/exterior cleaning' and low_price = 0.15 and high_price = 0.35;

update public.rate_card set unit = 'sqft', low_price = 12, high_price = 25,
  notes = 'Cold patch to hot mix depending on depth and traffic load'
where service_name = 'Pothole repair' and low_price = 8 and high_price = 18;

update public.rate_card set unit = 'sqft', low_price = 0.20, high_price = 0.40,
  notes = 'Sealcoating and minor patch resurfacing, not full asphalt overlay'
where service_name = 'Road/lot resurfacing' and low_price = 2.50 and high_price = 5.50;

-- New services — added by exact name if not already present, so this is safe
-- to run again without duplicating anything you've already added yourself.
insert into public.rate_card (service_name, unit, low_price, high_price, notes)
select * from (values
  ('Window cleaning (in & out)', 'window', 8, 15, 'Standard residential double-hung window, both sides'),
  ('Pressure washing', 'sqft', 0.25, 0.45, 'Driveway, patio, or siding — concrete costs more than wood/vinyl'),
  ('Gutter cleaning (interior)', 'linear ft', 1.50, 3.00, 'Debris removal and flush, single story — add for 2nd story or heavy buildup'),
  ('Gutter cleaning (exterior/brightening)', 'linear ft', 1.00, 2.00, 'Oxidation and streak removal on the outside face of gutters')
) as v(service_name, unit, low_price, high_price, notes)
where not exists (select 1 from public.rate_card r where r.service_name = v.service_name);

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

-- Conversations must exist before "messages" below, since messages references it.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_group boolean default true,
  is_general boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- The one always-on, all-hands channel. Fixed id so this insert is idempotent.
insert into public.conversations (id, name, is_group, is_general, created_by)
values ('00000000-0000-0000-0000-000000000001', 'General', true, true, null)
on conflict (id) do nothing;

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id),
  body text not null,
  redacted boolean default false,
  created_at timestamptz default now()
);
alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists redacted boolean default false;

-- Any pre-existing messages from before conversations existed belong to General.
update public.messages set conversation_id = '00000000-0000-0000-0000-000000000001'
where conversation_id is null;

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

create table if not exists public.user_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz default now()
);

create table if not exists public.territories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#2B4C6F',
  points jsonb not null default '[]', -- [{lat, lng}, ...] polygon vertices
  assigned_to uuid references auth.users(id),
  scheduled_date date,
  status text not null default 'Not Started', -- Not Started | In Progress | Completed
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

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
alter table public.business_settings add column if not exists driver_day_rate numeric default 0;

create table if not exists public.email_settings (
  id int primary key default 1,
  from_email text default 'onboarding@resend.dev',
  from_name text default 'SolutionXperts',
  updated_at timestamptz default now(),
  constraint single_row_email check (id = 1)
);
insert into public.email_settings (id) values (1) on conflict (id) do nothing;

-- Jobs: track exactly when a job was completed, so daily driver/sales reports
-- can be attributed to the correct calendar day.
alter table public.jobs add column if not exists completed_at timestamptz;

-- Work days: track who was "driver for the day" — this is who gets job-completion
-- notifications alongside admins, and shows up in the daily CSV export.
alter table public.work_days add column if not exists is_driver boolean default false;

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
alter table public.territories enable row level security;
alter table public.user_locations enable row level security;
alter table public.business_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.theme_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.email_settings enable row level security;

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
-- everyone's, for the Team Activity report; admins can also EDIT anyone's (to fix
-- a missed clock-out, correct a door count, etc).
drop policy if exists "own day log" on public.work_days;
create policy "own day log" on public.work_days for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "office read all day logs" on public.work_days;
create policy "office read all day logs" on public.work_days for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
);
drop policy if exists "admin edit all day logs" on public.work_days;
create policy "admin edit all day logs" on public.work_days for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "admin delete all day logs" on public.work_days;
create policy "admin delete all day logs" on public.work_days for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Territories: admins and salesmen can create/manage; everyone signed in can read
-- (a technician should be able to see the area they're scheduled to knock).
drop policy if exists "territories read" on public.territories;
create policy "territories read" on public.territories for select using (auth.role() = 'authenticated');
drop policy if exists "territories office write" on public.territories;
create policy "territories office write" on public.territories for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
);
drop policy if exists "territories office update" on public.territories;
create policy "territories office update" on public.territories for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','salesman'))
  or assigned_to = auth.uid()
);
drop policy if exists "territories admin delete" on public.territories;
create policy "territories admin delete" on public.territories for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- User locations: everyone can upsert their OWN last-known spot; only admins
-- can see everyone's (matches "can only be viewed as an admin").
drop policy if exists "user locations own upsert" on public.user_locations;
create policy "user locations own upsert" on public.user_locations for all using (
  user_id = auth.uid()
) with check (user_id = auth.uid());
drop policy if exists "user locations admin read" on public.user_locations;
create policy "user locations admin read" on public.user_locations for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
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

-- Conversations: readable if it's the General channel, you're a participant, or you're admin.
drop policy if exists "conversations read" on public.conversations;
create policy "conversations read" on public.conversations for select using (
  is_general = true
  or exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversations.id and cp.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "conversations insert" on public.conversations;
create policy "conversations insert" on public.conversations for insert with check (auth.role() = 'authenticated');

drop policy if exists "participants read" on public.conversation_participants;
create policy "participants read" on public.conversation_participants for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = conversation_participants.conversation_id and cp2.user_id = auth.uid()
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "participants insert" on public.conversation_participants;
create policy "participants insert" on public.conversation_participants for insert with check (auth.role() = 'authenticated');
drop policy if exists "participants delete" on public.conversation_participants;
create policy "participants delete" on public.conversation_participants for delete using (
  user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Messages: read/post only in the General channel or a conversation you're part of.
drop policy if exists "messages read" on public.messages;
create policy "messages read" on public.messages for select using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (
      c.is_general = true
      or exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.user_id = auth.uid())
    )
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "messages insert" on public.messages;
create policy "messages insert" on public.messages for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (
      c.is_general = true
      or exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.user_id = auth.uid())
    )
  )
);
drop policy if exists "messages delete" on public.messages;
create policy "messages delete" on public.messages for delete using (
  sender_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "messages redact" on public.messages;
create policy "messages redact" on public.messages for update using (
  sender_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Email settings: everyone reads (server routes need it), only admin edits.
drop policy if exists "email settings read" on public.email_settings;
create policy "email settings read" on public.email_settings for select using (auth.role() = 'authenticated');
drop policy if exists "email settings admin write" on public.email_settings;
create policy "email settings admin write" on public.email_settings for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

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

-- Deleting an employee's login should never be blocked by their history in the
-- app, and it shouldn't erase real business records either — a customer, job,
-- or quote they created stays on the books, it just no longer points at a
-- valid user. Rows that are ONLY meaningful in relation to that specific user
-- (their day logs, their notifications) get removed with them instead.
do $$
declare
  r record;
begin
  for r in (values
    ('public.customers', 'created_by'),
    ('public.customer_notes', 'created_by'),
    ('public.door_logs', 'created_by'),
    ('public.quotes', 'created_by'),
    ('public.quotes', 'salesman_id'),
    ('public.jobs', 'created_by'),
    ('public.jobs', 'assigned_to'),
    ('public.jobs', 'sold_by'),
    ('public.rate_card', 'created_by'),
    ('public.job_photos', 'uploaded_by'),
    ('public.messages', 'sender_id'),
    ('public.territories', 'created_by'),
    ('public.territories', 'assigned_to'),
    ('public.expenses', 'created_by')
  ) loop
    execute format(
      'alter table %s drop constraint if exists %s',
      r.column1,
      replace(r.column1, 'public.', '') || '_' || r.column2 || '_fkey'
    );
    execute format(
      'alter table %s add constraint %s foreign key (%s) references auth.users(id) on delete set null',
      r.column1,
      replace(r.column1, 'public.', '') || '_' || r.column2 || '_fkey',
      r.column2
    );
  end loop;
end $$;

-- These only make sense tied to a specific person, so remove them with the user.
alter table public.notifications drop constraint if exists notifications_recipient_id_fkey;
alter table public.notifications
  add constraint notifications_recipient_id_fkey
  foreign key (recipient_id) references auth.users(id) on delete cascade;

alter table public.work_days drop constraint if exists work_days_user_id_fkey;
alter table public.work_days
  add constraint work_days_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
