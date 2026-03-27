-- Tradable MVP schema

-- User profiles: role is set at signup and never changes
create table if not exists user_profiles (
  user_id uuid primary key,
  role text not null check (role in ('customer', 'pro')),
  created_at timestamptz not null default now()
);

-- Pro profiles: created during onboarding, one per pro user
create table if not exists pro_profiles (
  user_id uuid primary key,
  full_name text,
  email text,
  phone text,
  photo_url text,
  display_name text,
  trade text not null,
  years_of_experience integer,
  business_number text,
  certifications text,
  cal_username text,
  cal_event_type_id integer,
  consultation_price_cents integer not null default 0,
  latitude float8,
  longitude float8,
  service_radius_miles integer,
  stripe_account_id text,
  stripe_onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  trade text not null,
  description text not null,
  status text not null default 'open',
  payment_status text not null default 'unpaid',
  amount_paid_cents integer,
  created_at timestamptz not null default now(),
  customer_id uuid,
  claimed_by uuid,
  latitude float8,
  longitude float8
);

create table if not exists outcomes (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null,
  diagnosis text not null,
  estimate_low integer,
  estimate_high integer,
  onsite_needed boolean not null,
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Note: the Express backend uses the service role key and bypasses RLS.
-- These policies protect direct Supabase client access (defense in depth).

alter table user_profiles enable row level security;
alter table pro_profiles enable row level security;
alter table requests enable row level security;
alter table outcomes enable row level security;

-- user_profiles: users can only read/write their own role
create policy "user_profiles: owner access" on user_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- pro_profiles: any authenticated user can read (customers need to see pro info)
create policy "pro_profiles: authenticated read" on pro_profiles
  for select to authenticated using (true);

-- pro_profiles: only the owner can insert/update their own profile
create policy "pro_profiles: owner write" on pro_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- requests: any authenticated user can read (backend filters by role)
create policy "requests: authenticated read" on requests
  for select to authenticated using (true);

-- requests: customers can only create requests tied to their own user ID
create policy "requests: customer insert" on requests
  for insert to authenticated with check (auth.uid() = customer_id);

-- requests: authenticated users can update (backend enforces claim/status rules)
create policy "requests: authenticated update" on requests
  for update to authenticated using (true);

-- outcomes: authenticated users can read and write (backend enforces pro-only writes)
create policy "outcomes: authenticated all" on outcomes
  for all to authenticated using (true) with check (true);

-- ─── Storage ─────────────────────────────────────────────────────────────────
-- Run once in Supabase dashboard → Storage → New bucket:
--   Name: avatars, Public: true
-- Then add this RLS policy in Storage → Policies:
--   INSERT/UPDATE: (auth.uid()::text) = (storage.foldername(name))[1]  (allow users to upload to their own path)

-- ─── Migrations (run against existing deployments) ───────────────────────────
-- alter table requests rename column customer_email to customer_id;
-- alter table requests alter column customer_id type uuid using customer_id::uuid;
-- alter table requests alter column claimed_by type uuid using claimed_by::uuid;
-- alter table outcomes alter column call_id type uuid using call_id::uuid;
-- alter table requests add column if not exists payment_status text not null default 'unpaid';
-- alter table requests add column if not exists amount_paid_cents integer;
-- create table if not exists user_profiles (user_id uuid primary key, role text not null check (role in ('customer', 'pro')), created_at timestamptz not null default now());
-- alter table pro_profiles add column if not exists full_name text;
-- alter table pro_profiles add column if not exists email text;
-- alter table pro_profiles add column if not exists phone text;
-- alter table pro_profiles add column if not exists photo_url text;
-- alter table pro_profiles add column if not exists years_of_experience integer;
-- alter table pro_profiles add column if not exists business_number text;
-- alter table pro_profiles add column if not exists certifications text;
-- alter table pro_profiles add column if not exists cal_username text;
-- alter table pro_profiles alter column cal_event_type_id drop not null;
-- alter table pro_profiles add column if not exists consultation_price_cents integer not null default 0;
-- alter table pro_profiles add column if not exists stripe_account_id text;
-- alter table pro_profiles add column if not exists stripe_onboarding_complete boolean not null default false;
