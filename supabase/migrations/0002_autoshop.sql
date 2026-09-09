-- Bayline auto shop layer. Apply after 0001_init.sql.
-- Extends B&C Core tables instead of replacing them.

alter table public.profiles add column if not exists position_key text;
alter table public.company_settings add column if not exists tax_rate numeric not null default 0;
alter table public.company_settings add column if not exists default_labor_rate numeric not null default 0;
alter table public.company_settings add column if not exists payment_note text not null default '';

alter table public.appointments add column if not exists vehicle_id uuid;
alter table public.appointments add column if not exists service_advisor_id uuid references public.profiles(id);
alter table public.appointments add column if not exists appointment_type text;
alter table public.appointments add column if not exists customer_concern text not null default '';

alter table public.tasks add column if not exists vehicle_id uuid;
alter table public.tasks add column if not exists repair_order_id uuid;

alter table public.documents add column if not exists vehicle_id uuid;
alter table public.documents add column if not exists repair_order_id uuid;
alter table public.documents add column if not exists estimate_id uuid;
alter table public.documents add column if not exists inspection_id uuid;

create table if not exists public.lookup_options (
  id uuid primary key default gen_random_uuid(),
  list text not null,
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  unique (list, key)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.clients(id),
  vin text not null default '',
  year integer not null,
  make text not null,
  model text not null,
  trim text not null default '',
  mileage integer not null default 0,
  license_plate text not null default '',
  color text not null default '',
  notes text not null default '',
  status text not null default 'active',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repair_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid not null references public.clients(id),
  vehicle_id uuid not null references public.vehicles(id),
  mileage integer not null default 0,
  service_advisor_id uuid references public.profiles(id),
  technician_id uuid references public.profiles(id),
  opened_at timestamptz not null default now(),
  estimated_completion date,
  completed_at timestamptz,
  customer_concern text not null default '',
  diagnosis text not null default '',
  recommended_work text not null default '',
  approved_work text not null default '',
  declined_work text not null default '',
  notes text not null default '',
  status text not null,
  discount numeric not null default 0,
  tax_rate numeric not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repair_order_items (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid not null references public.repair_orders(id) on delete cascade,
  kind text not null,
  description text not null,
  service_id uuid,
  part_id uuid,
  quantity numeric not null default 1,
  unit_cost numeric not null default 0,
  unit_price numeric not null default 0,
  hours numeric not null default 0,
  approved boolean not null default true,
  declined boolean not null default false,
  technician_id uuid references public.profiles(id)
);

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid not null references public.clients(id),
  vehicle_id uuid not null references public.vehicles(id),
  repair_order_id uuid references public.repair_orders(id),
  notes text not null default '',
  status text not null,
  discount numeric not null default 0,
  tax_rate numeric not null default 0,
  expires_at date,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  kind text not null,
  description text not null,
  service_id uuid,
  part_id uuid,
  quantity numeric not null default 1,
  unit_cost numeric not null default 0,
  unit_price numeric not null default 0,
  hours numeric not null default 0
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid not null references public.clients(id),
  vehicle_id uuid not null references public.vehicles(id),
  repair_order_id uuid references public.repair_orders(id),
  technician_id uuid references public.profiles(id),
  mileage integer not null default 0,
  notes text not null default '',
  recommendations text not null default '',
  status text not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  category_key text not null,
  result text not null,
  measurement text not null default '',
  notes text not null default '',
  recommendation text not null default ''
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_key text,
  default_hours numeric not null default 0,
  default_price numeric not null default 0,
  active boolean not null default true
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  notes text not null default ''
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  part_number text not null default '',
  description text not null default '',
  supplier_id uuid references public.suppliers(id),
  category_key text,
  kind text not null default 'part',
  cost numeric not null default 0,
  price numeric not null default 0,
  quantity numeric not null default 0,
  min_quantity numeric not null default 0,
  unit text not null default 'each',
  location text not null default '',
  compatibility text not null default '',
  active boolean not null default true
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id),
  type text not null,
  quantity numeric not null,
  note text not null default '',
  repair_order_id uuid references public.repair_orders(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.technician_assignments (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id),
  repair_order_id uuid not null references public.repair_orders(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  priority text not null default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  label text not null default '',
  status text not null,
  notes text not null default ''
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid not null references public.repair_orders(id),
  method text not null,
  amount numeric not null,
  status text not null,
  note text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.customer_communications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.clients(id),
  vehicle_id uuid references public.vehicles(id),
  repair_order_id uuid references public.repair_orders(id),
  type text not null,
  subject text not null,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists vehicles_customer_idx on public.vehicles (customer_id);
create index if not exists vehicles_vin_idx on public.vehicles (vin);
create index if not exists vehicles_plate_idx on public.vehicles (license_plate);
create index if not exists repair_orders_vehicle_idx on public.repair_orders (vehicle_id);
create index if not exists repair_orders_tech_idx on public.repair_orders (technician_id);
create index if not exists parts_number_idx on public.parts (part_number);
create index if not exists shifts_date_idx on public.shifts (date);

alter table public.lookup_options enable row level security;
alter table public.vehicles enable row level security;
alter table public.repair_orders enable row level security;
alter table public.repair_order_items enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.services enable row level security;
alter table public.suppliers enable row level security;
alter table public.parts enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.technician_assignments enable row level security;
alter table public.shifts enable row level security;
alter table public.payments enable row level security;
alter table public.customer_communications enable row level security;

create policy "lookups_read" on public.lookup_options for select using (auth.uid() is not null);
create policy "lookups_manage" on public.lookup_options for all using (public.has_permission('settings', 'edit'));

create policy "vehicles_select" on public.vehicles for select using (public.has_permission('vehicles', 'view'));
create policy "vehicles_insert" on public.vehicles for insert with check (public.has_permission('vehicles', 'create'));
create policy "vehicles_update" on public.vehicles for update using (public.has_permission('vehicles', 'edit'));

create policy "ro_select" on public.repair_orders for select using (public.has_permission('repair_orders', 'view'));
create policy "ro_insert" on public.repair_orders for insert with check (public.has_permission('repair_orders', 'create'));
create policy "ro_update" on public.repair_orders for update using (public.has_permission('repair_orders', 'edit'));
create policy "roi_all" on public.repair_order_items for all using (public.has_permission('repair_orders', 'edit') or public.has_permission('repair_orders', 'view'));

create policy "est_select" on public.estimates for select using (public.has_permission('estimates', 'view'));
create policy "est_write" on public.estimates for all using (public.has_permission('estimates', 'edit') or public.has_permission('estimates', 'create'));
create policy "esti_all" on public.estimate_items for all using (public.has_permission('estimates', 'edit') or public.has_permission('estimates', 'view'));

create policy "insp_select" on public.inspections for select using (public.has_permission('inspections', 'view'));
create policy "insp_write" on public.inspections for all using (public.has_permission('inspections', 'edit') or public.has_permission('inspections', 'create'));
create policy "inspi_all" on public.inspection_items for all using (public.has_permission('inspections', 'edit') or public.has_permission('inspections', 'view'));

create policy "parts_select" on public.parts for select using (public.has_permission('parts', 'view'));
create policy "parts_write" on public.parts for all using (public.has_permission('parts', 'edit') or public.has_permission('parts', 'create'));
create policy "inv_select" on public.inventory_transactions for select using (public.has_permission('inventory', 'view'));
create policy "inv_write" on public.inventory_transactions for all using (public.has_permission('inventory', 'edit'));

create policy "tech_select" on public.technician_assignments for select using (public.has_permission('technicians', 'view'));
create policy "shifts_select" on public.shifts for select using (public.has_permission('scheduling', 'view'));
create policy "shifts_write" on public.shifts for all using (public.has_permission('scheduling', 'edit') or public.has_permission('scheduling', 'create'));

create policy "pay_select" on public.payments for select using (public.has_permission('payments', 'view'));
create policy "pay_write" on public.payments for all using (public.has_permission('payments', 'create') or public.has_permission('payments', 'edit'));

create policy "comms_select" on public.customer_communications for select using (public.has_permission('clients', 'view'));
create policy "comms_write" on public.customer_communications for all using (public.has_permission('clients', 'edit'));

create policy "services_read" on public.services for select using (auth.uid() is not null);
create policy "suppliers_read" on public.suppliers for select using (public.has_permission('parts', 'view'));
