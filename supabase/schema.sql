-- Tradable MVP schema

-- Pro profiles: created during onboarding, one per pro user
create table if not exists pro_profiles (
  user_id uuid primary key,
  display_name text,
  trade text not null,
  cal_event_type_id integer not null,
  latitude float8,
  longitude float8,
  service_radius_miles integer,
  created_at timestamptz not null default now()
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  trade text not null,
  description text not null,
  status text not null default 'open',
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

-- Existing deployments: run these migrations if upgrading from the old schema:
-- alter table requests rename column customer_email to customer_id;
-- alter table requests alter column customer_id type uuid using customer_id::uuid;
-- alter table requests alter column claimed_by type uuid using claimed_by::uuid;
-- alter table outcomes alter column call_id type uuid using call_id::uuid;
