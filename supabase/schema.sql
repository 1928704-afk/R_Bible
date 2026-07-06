create table if not exists public.organizations (
  id text primary key,
  name text not null,
  invite_code text not null unique,
  owner_name text not null,
  created_at date not null default current_date
);

create table if not exists public.departments (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  monthly_target_members integer not null default 300 check (monthly_target_members > 0)
);

create table if not exists public.members (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  department_id text not null references public.departments(id) on delete cascade,
  name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.reading_logs (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  department_id text not null references public.departments(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  member_name text not null,
  date date not null,
  passage text,
  reflection text,
  created_at timestamptz not null default now()
);

create index if not exists departments_organization_id_idx on public.departments(organization_id);
create index if not exists members_organization_id_idx on public.members(organization_id);
create index if not exists reading_logs_organization_id_date_idx on public.reading_logs(organization_id, date desc);
create unique index if not exists reading_logs_member_date_idx on public.reading_logs(member_id, date);

alter table public.organizations enable row level security;
alter table public.departments enable row level security;
alter table public.members enable row level security;
alter table public.reading_logs enable row level security;

drop policy if exists "public read organizations" on public.organizations;
drop policy if exists "public insert organizations" on public.organizations;
drop policy if exists "public read departments" on public.departments;
drop policy if exists "public insert departments" on public.departments;
drop policy if exists "public read members" on public.members;
drop policy if exists "public insert members" on public.members;
drop policy if exists "public read reading logs" on public.reading_logs;
drop policy if exists "public insert reading logs" on public.reading_logs;
drop policy if exists "public delete reading logs" on public.reading_logs;

create policy "public read organizations" on public.organizations for select using (true);
create policy "public insert organizations" on public.organizations for insert with check (true);

create policy "public read departments" on public.departments for select using (true);
create policy "public insert departments" on public.departments for insert with check (true);

create policy "public read members" on public.members for select using (true);
create policy "public insert members" on public.members for insert with check (true);

create policy "public read reading logs" on public.reading_logs for select using (true);
create policy "public insert reading logs" on public.reading_logs for insert with check (true);
create policy "public delete reading logs" on public.reading_logs for delete using (true);
