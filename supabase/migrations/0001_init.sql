-- B&C General Management System schema
-- Apply in the Supabase SQL editor. Keep the service role key on the server only.

create extension if not exists "pgcrypto";

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module text not null,
  action text not null,
  description text not null default ''
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text not null default '',
  title text not null default '',
  role_id uuid references public.roles(id),
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  id text primary key default 'default',
  name text not null,
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('individual', 'business')),
  display_name text not null,
  legal_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  region text not null default '',
  postal_code text not null default '',
  country text not null default '',
  status text not null default 'active',
  notes text not null default '',
  tags text[] not null default '{}',
  assigned_employee_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  title text not null default '',
  is_primary boolean not null default false
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.clients(id),
  status text not null,
  start_date date,
  end_date date,
  notes text not null default '',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, profile_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null,
  priority text not null,
  assigned_employee_id uuid references public.profiles(id),
  client_id uuid references public.clients(id),
  project_id uuid references public.projects(id),
  due_date date,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid references public.clients(id),
  employee_id uuid references public.profiles(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  location text not null default '',
  notes text not null default '',
  status text not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  mime_type text not null,
  size_bytes integer not null,
  storage_path text not null,
  client_id uuid references public.clients(id),
  project_id uuid references public.projects(id),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text not null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  related_type text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  description text not null,
  actor_id uuid references public.profiles(id),
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists clients_assigned_idx on public.clients (assigned_employee_id);
create index if not exists tasks_assignee_idx on public.tasks (assigned_employee_id);
create index if not exists appointments_date_idx on public.appointments (date);
create index if not exists activities_created_idx on public.activities (created_at desc);

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.company_settings enable row level security;
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.appointments enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.activities enable row level security;

create or replace function public.current_profile_role_key()
returns text
language sql
stable
as $$
  select r.key
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.status = 'active'
$$;

create or replace function public.has_permission(module_name text, action_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where p.id = auth.uid()
      and p.status = 'active'
      and (
        (perm.module = module_name and perm.action in (action_name, 'manage'))
        or perm.key = module_name || '.manage'
      )
  )
$$;

create policy "profiles_select" on public.profiles for select using (
  auth.uid() = id or public.has_permission('users', 'view')
);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin" on public.profiles for all using (public.has_permission('users', 'manage'));

create policy "roles_read" on public.roles for select using (auth.uid() is not null);
create policy "roles_manage" on public.roles for all using (public.has_permission('roles', 'manage'));
create policy "permissions_read" on public.permissions for select using (auth.uid() is not null);
create policy "role_permissions_read" on public.role_permissions for select using (auth.uid() is not null);
create policy "role_permissions_manage" on public.role_permissions for all using (public.has_permission('roles', 'manage'));

create policy "settings_read" on public.company_settings for select using (public.has_permission('settings', 'view'));
create policy "settings_edit" on public.company_settings for update using (public.has_permission('settings', 'edit'));

create policy "clients_select" on public.clients for select using (public.has_permission('clients', 'view'));
create policy "clients_insert" on public.clients for insert with check (public.has_permission('clients', 'create'));
create policy "clients_update" on public.clients for update using (public.has_permission('clients', 'edit'));

create policy "projects_select" on public.projects for select using (public.has_permission('projects', 'view'));
create policy "projects_insert" on public.projects for insert with check (public.has_permission('projects', 'create'));
create policy "projects_update" on public.projects for update using (public.has_permission('projects', 'edit'));

create policy "tasks_select" on public.tasks for select using (public.has_permission('tasks', 'view'));
create policy "tasks_insert" on public.tasks for insert with check (public.has_permission('tasks', 'create'));
create policy "tasks_update" on public.tasks for update using (public.has_permission('tasks', 'edit'));

create policy "appointments_select" on public.appointments for select using (public.has_permission('appointments', 'view'));
create policy "appointments_write" on public.appointments for all using (public.has_permission('appointments', 'edit') or public.has_permission('appointments', 'create'));

create policy "documents_select" on public.documents for select using (public.has_permission('documents', 'view'));
create policy "documents_insert" on public.documents for insert with check (public.has_permission('documents', 'create'));

create policy "notifications_own" on public.notifications for select using (recipient_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (recipient_id = auth.uid());

create policy "activities_select" on public.activities for select using (public.has_permission('activity', 'view'));
create policy "activities_insert" on public.activities for insert with check (auth.uid() is not null);
-- No update/delete policies: audit history is append-only for ordinary users.
