-- Tradable MVP schema

create type request_status as enum ('open', 'matched', 'in_call', 'completed', 'canceled');
create type outcome_next_step as enum ('onsite_visit', 'virtual_followup', 'customer_fix', 'quote_provided');

create table if not exists pro_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade text not null,
  service_radius_miles integer not null default 25,
  min_consult_price integer not null default 0,
  availability_text text,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  trade text not null,
  description text not null,
  status request_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  pro_id uuid not null references auth.users(id) on delete cascade,
  room_name text not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id)
);

create table if not exists outcomes (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references calls(id) on delete cascade,
  diagnosis_text text not null,
  next_step_enum outcome_next_step not null,
  estimate_low integer,
  estimate_high integer,
  onsite_needed_bool boolean not null default false,
  created_at timestamptz not null default now(),
  unique (call_id)
);

alter table pro_profiles enable row level security;
alter table requests enable row level security;
alter table calls enable row level security;
alter table outcomes enable row level security;

-- pro_profiles policies
create policy "pro_profiles_select_own"
  on pro_profiles for select
  using (auth.uid() = user_id);

create policy "pro_profiles_write_own"
  on pro_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- requests policies
create policy "requests_insert_customer"
  on requests for insert
  with check (auth.uid() = customer_id);

create policy "requests_select_open"
  on requests for select
  using (status = 'open' and auth.role() = 'authenticated');

create policy "requests_select_customer"
  on requests for select
  using (customer_id = auth.uid());

create policy "requests_select_assigned_pro"
  on requests for select
  using (
    exists (
      select 1
      from calls
      where calls.request_id = requests.id
        and calls.pro_id = auth.uid()
    )
  );

create policy "requests_update_assigned_pro"
  on requests for update
  using (
    exists (
      select 1
      from calls
      where calls.request_id = requests.id
        and calls.pro_id = auth.uid()
    )
  );

-- calls policies
create policy "calls_select_participants"
  on calls for select
  using (
    pro_id = auth.uid()
    or exists (
      select 1
      from requests
      where requests.id = calls.request_id
        and requests.customer_id = auth.uid()
    )
  );

create policy "calls_insert_pro"
  on calls for insert
  with check (auth.uid() = pro_id);

create policy "calls_update_participants"
  on calls for update
  using (
    pro_id = auth.uid()
    or exists (
      select 1
      from requests
      where requests.id = calls.request_id
        and requests.customer_id = auth.uid()
    )
  );

-- outcomes policies
create policy "outcomes_select_participants"
  on outcomes for select
  using (
    exists (
      select 1
      from calls
      join requests on requests.id = calls.request_id
      where calls.id = outcomes.call_id
        and (calls.pro_id = auth.uid() or requests.customer_id = auth.uid())
    )
  );

create policy "outcomes_write_pro"
  on outcomes for all
  using (
    exists (
      select 1
      from calls
      where calls.id = outcomes.call_id
        and calls.pro_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from calls
      where calls.id = outcomes.call_id
        and calls.pro_id = auth.uid()
    )
  );
