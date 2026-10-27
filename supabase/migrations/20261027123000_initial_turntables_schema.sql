begin;

create extension if not exists pgcrypto;

create type public.restaurant_status as enum ('active', 'suspended', 'archived');
create type public.membership_role as enum ('restaurant_owner', 'branch_manager', 'staff', 'kitchen');
create type public.record_status as enum ('active', 'inactive', 'archived');
create type public.dining_session_status as enum ('open', 'checkout', 'closed');
create type public.order_status as enum ('pending_payment', 'partially_paid', 'paid', 'preparing', 'ready', 'served', 'cancelled');
create type public.payment_status as enum ('created', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');
create type public.allocation_status as enum ('proposed', 'reserved', 'payment_pending', 'partially_paid', 'paid', 'failed', 'expired', 'cancelled');
create type public.split_mode as enum ('full_bill', 'equal', 'item_based', 'custom_amount');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.restaurant_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  slug text not null,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  address jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);

create table public.staff_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (staff_user_id, restaurant_id, branch_id, role)
);

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  table_number integer not null check (table_number > 0),
  display_name text,
  seats integer not null default 2 check (seats > 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, table_number)
);

create table public.table_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.dining_tables(id) on delete cascade,
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  check (expires_at is null or expires_at > issued_at)
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, name)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  price_minor integer not null check (price_minor >= 0),
  tax_code text,
  prep_minutes integer check (prep_minutes is null or prep_minutes > 0),
  available boolean not null default true,
  is_quick boolean not null default false,
  is_new boolean not null default false,
  vegetarian boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price_minor integer not null check (price_minor >= 0),
  status public.record_status not null default 'active',
  unique (menu_item_id, name)
);

create table public.menu_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price_minor integer not null check (price_minor >= 0),
  status public.record_status not null default 'active',
  unique (menu_item_id, name)
);

create table public.menu_item_availability (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  available boolean not null default true,
  reason text,
  starts_at timestamptz,
  ends_at timestamptz,
  unique (menu_item_id, branch_id)
);

create table public.dining_sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  table_id uuid not null references public.dining_tables(id) on delete restrict,
  status public.dining_session_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  join_token_hash text not null unique,
  check (closed_at is null or closed_at >= opened_at)
);

create table public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table public.dining_session_members (
  id uuid primary key default gen_random_uuid(),
  dining_session_id uuid not null references public.dining_sessions(id) on delete cascade,
  customer_session_id uuid not null references public.customer_sessions(id) on delete cascade,
  display_name text,
  status public.record_status not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (dining_session_id, customer_session_id)
);

create table public.kitchen_orders (
  id uuid primary key default gen_random_uuid(),
  dining_session_id uuid not null references public.dining_sessions(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_number bigint generated always as identity,
  status public.order_status not null default 'pending_payment',
  placed_at timestamptz not null default now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  cancelled_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, idempotency_key)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  dining_session_id uuid not null unique references public.dining_sessions(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor integer not null default 0 check (subtotal_minor >= 0),
  discount_minor integer not null default 0 check (discount_minor >= 0),
  tax_minor integer not null default 0 check (tax_minor >= 0),
  total_minor integer not null default 0 check (total_minor >= 0),
  paid_minor integer not null default 0 check (paid_minor >= 0),
  outstanding_minor integer not null default 0 check (outstanding_minor >= 0),
  status public.allocation_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kitchen_order_items (
  id uuid primary key default gen_random_uuid(),
  kitchen_order_id uuid not null references public.kitchen_orders(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete restrict,
  added_by_member_id uuid not null references public.dining_session_members(id) on delete restrict,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  variant_id uuid references public.menu_item_variants(id) on delete set null,
  item_name_snapshot text not null,
  unit_price_minor_snapshot integer not null check (unit_price_minor_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  modifiers_snapshot jsonb not null default '[]'::jsonb,
  tax_minor integer not null default 0 check (tax_minor >= 0),
  discount_minor integer not null default 0 check (discount_minor >= 0),
  line_total_minor integer not null check (line_total_minor >= 0),
  created_at timestamptz not null default now()
);

create table public.bill_item_assignments (
  id uuid primary key default gen_random_uuid(),
  bill_item_id uuid not null references public.kitchen_order_items(id) on delete cascade,
  member_id uuid not null references public.dining_session_members(id) on delete restrict,
  quantity integer check (quantity is null or quantity > 0),
  percentage_basis_points integer check (percentage_basis_points is null or (percentage_basis_points > 0 and percentage_basis_points <= 10000)),
  assigned_amount_minor integer not null check (assigned_amount_minor >= 0),
  created_at timestamptz not null default now(),
  unique (bill_item_id, member_id),
  check (quantity is not null or percentage_basis_points is not null)
);

create table public.payment_groups (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  mode public.split_mode not null,
  total_minor integer not null check (total_minor >= 0),
  allocated_minor integer not null default 0 check (allocated_minor >= 0),
  paid_minor integer not null default 0 check (paid_minor >= 0),
  outstanding_minor integer not null default 0 check (outstanding_minor >= 0),
  status public.allocation_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_group_id uuid not null references public.payment_groups(id) on delete restrict,
  beneficiary_member_id uuid not null references public.dining_session_members(id) on delete restrict,
  payer_member_id uuid references public.dining_session_members(id) on delete restrict,
  allocation_type text not null check (allocation_type in ('full_bill', 'equal', 'item_based', 'custom_amount', 'shared_item')),
  requested_amount_minor integer not null check (requested_amount_minor > 0),
  assigned_amount_minor integer not null check (assigned_amount_minor > 0),
  paid_amount_minor integer not null default 0 check (paid_amount_minor >= 0),
  status public.allocation_status not null default 'proposed',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payment_group_id, beneficiary_member_id, version)
);

create table public.payment_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  onboarding_status text not null default 'pending',
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_allocation_id uuid not null references public.payment_allocations(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  provider_order_id text,
  status public.payment_status not null default 'created',
  method text,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null,
  paid_at timestamptz,
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id),
  unique (provider, provider_payment_id),
  unique (payment_allocation_id, idempotency_key)
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index branches_restaurant_status_idx on public.branches (restaurant_id, status);
create index staff_memberships_user_scope_idx on public.staff_memberships (staff_user_id, restaurant_id, branch_id);
create index dining_tables_branch_number_idx on public.dining_tables (branch_id, table_number);
create index table_qr_tokens_hash_idx on public.table_qr_tokens (token_hash);
create index menu_categories_branch_status_idx on public.menu_categories (branch_id, status, sort_order);
create index menu_items_branch_status_category_idx on public.menu_items (branch_id, status, category_id);
create index dining_sessions_branch_table_status_idx on public.dining_sessions (branch_id, table_id, status, opened_at desc);
create index dining_session_members_session_status_idx on public.dining_session_members (dining_session_id, status);
create index kitchen_orders_branch_status_idx on public.kitchen_orders (branch_id, status, placed_at desc);
create index kitchen_orders_session_idx on public.kitchen_orders (dining_session_id, placed_at desc);
create index kitchen_order_items_order_idx on public.kitchen_order_items (kitchen_order_id);
create index kitchen_order_items_bill_idx on public.kitchen_order_items (bill_id);
create index bill_item_assignments_item_member_idx on public.bill_item_assignments (bill_item_id, member_id);
create index payment_groups_bill_status_idx on public.payment_groups (bill_id, status);
create index payment_allocations_group_status_idx on public.payment_allocations (payment_group_id, status);
create index payment_attempts_allocation_status_idx on public.payment_attempts (payment_allocation_id, status);
create index payment_webhook_events_provider_event_idx on public.payment_webhook_events (provider, provider_event_id);
create index audit_logs_scope_created_idx on public.audit_logs (restaurant_id, branch_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at before update on public.restaurants for each row execute function public.set_updated_at();
create trigger branches_set_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger staff_users_set_updated_at before update on public.staff_users for each row execute function public.set_updated_at();
create trigger dining_tables_set_updated_at before update on public.dining_tables for each row execute function public.set_updated_at();
create trigger menu_categories_set_updated_at before update on public.menu_categories for each row execute function public.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
create trigger dining_sessions_set_updated_at before update on public.dining_sessions for each row execute function public.set_updated_at();
create trigger kitchen_orders_set_updated_at before update on public.kitchen_orders for each row execute function public.set_updated_at();
create trigger bills_set_updated_at before update on public.bills for each row execute function public.set_updated_at();
create trigger payment_groups_set_updated_at before update on public.payment_groups for each row execute function public.set_updated_at();
create trigger payment_allocations_set_updated_at before update on public.payment_allocations for each row execute function public.set_updated_at();
create trigger payment_provider_accounts_set_updated_at before update on public.payment_provider_accounts for each row execute function public.set_updated_at();
create trigger payment_attempts_set_updated_at before update on public.payment_attempts for each row execute function public.set_updated_at();

create or replace function public.is_restaurant_member(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    join public.staff_users su on su.id = sm.staff_user_id
    where sm.staff_user_id = auth.uid()
      and sm.restaurant_id = target_restaurant_id
      and su.status = 'active'
  );
$$;

create or replace function public.has_branch_access(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    join public.staff_users su on su.id = sm.staff_user_id
    join public.branches b on b.id = target_branch_id and b.restaurant_id = sm.restaurant_id
    where sm.staff_user_id = auth.uid()
      and su.status = 'active'
      and (sm.branch_id is null or sm.branch_id = target_branch_id)
  );
$$;

create or replace function public.has_branch_role(target_branch_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    join public.staff_users su on su.id = sm.staff_user_id
    join public.branches b on b.id = target_branch_id and b.restaurant_id = sm.restaurant_id
    where sm.staff_user_id = auth.uid()
      and su.status = 'active'
      and sm.role = any(allowed_roles)
      and (sm.branch_id is null or sm.branch_id = target_branch_id)
  );
$$;

create or replace function public.has_restaurant_role(target_restaurant_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_memberships sm
    join public.staff_users su on su.id = sm.staff_user_id
    where sm.staff_user_id = auth.uid()
      and sm.restaurant_id = target_restaurant_id
      and su.status = 'active'
      and sm.role = any(allowed_roles)
  );
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.is_restaurant_member(uuid) from public;
revoke all on function public.has_branch_access(uuid) from public;
revoke all on function public.has_branch_role(uuid, public.membership_role[]) from public;
revoke all on function public.has_restaurant_role(uuid, public.membership_role[]) from public;

grant execute on function public.is_restaurant_member(uuid) to authenticated;
grant execute on function public.has_branch_access(uuid) to authenticated;
grant execute on function public.has_branch_role(uuid, public.membership_role[]) to authenticated;
grant execute on function public.has_restaurant_role(uuid, public.membership_role[]) to authenticated;

alter table public.restaurants enable row level security;
alter table public.branches enable row level security;
alter table public.staff_users enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.dining_tables enable row level security;
alter table public.table_qr_tokens enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_variants enable row level security;
alter table public.menu_item_modifiers enable row level security;
alter table public.menu_item_availability enable row level security;
alter table public.dining_sessions enable row level security;
alter table public.customer_sessions enable row level security;
alter table public.dining_session_members enable row level security;
alter table public.kitchen_orders enable row level security;
alter table public.bills enable row level security;
alter table public.kitchen_order_items enable row level security;
alter table public.bill_item_assignments enable row level security;
alter table public.payment_groups enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_provider_accounts enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.audit_logs enable row level security;

create policy restaurants_staff_select on public.restaurants for select to authenticated using (public.is_restaurant_member(id));
create policy restaurants_owner_update on public.restaurants for update to authenticated using (public.has_restaurant_role(id, array['restaurant_owner']::public.membership_role[])) with check (public.has_restaurant_role(id, array['restaurant_owner']::public.membership_role[]));

create policy branches_staff_select on public.branches for select to authenticated using (public.is_restaurant_member(restaurant_id));
create policy branches_owner_insert on public.branches for insert to authenticated with check (public.has_restaurant_role(restaurant_id, array['restaurant_owner']::public.membership_role[]));
create policy branches_manager_update on public.branches for update to authenticated using (public.has_restaurant_role(restaurant_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])) with check (public.has_restaurant_role(restaurant_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]));

create policy staff_users_self_select on public.staff_users for select to authenticated using (id = auth.uid());
create policy staff_memberships_member_select on public.staff_memberships for select to authenticated using (staff_user_id = auth.uid() or public.is_restaurant_member(restaurant_id));
create policy staff_memberships_owner_manage on public.staff_memberships for all to authenticated using (public.has_restaurant_role(restaurant_id, array['restaurant_owner']::public.membership_role[])) with check (public.has_restaurant_role(restaurant_id, array['restaurant_owner']::public.membership_role[]));

create policy dining_tables_staff_select on public.dining_tables for select to authenticated using (public.has_branch_access(branch_id));
create policy dining_tables_manager_manage on public.dining_tables for all to authenticated using (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])) with check (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]));
create policy table_qr_tokens_staff_access on public.table_qr_tokens for all to authenticated using (exists (select 1 from public.dining_tables dt where dt.id = table_id and public.has_branch_role(dt.branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]))) with check (exists (select 1 from public.dining_tables dt where dt.id = table_id and public.has_branch_role(dt.branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])));

create policy menu_categories_staff_select on public.menu_categories for select to authenticated using (public.has_branch_access(branch_id));
create policy menu_categories_manager_manage on public.menu_categories for all to authenticated using (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])) with check (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]));
create policy menu_items_staff_select on public.menu_items for select to authenticated using (public.has_branch_access(branch_id));
create policy menu_items_manager_manage on public.menu_items for all to authenticated using (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])) with check (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]));
create policy menu_item_variants_staff_select on public.menu_item_variants for select to authenticated using (exists (select 1 from public.menu_items mi where mi.id = menu_item_id and public.has_branch_access(mi.branch_id)));
create policy menu_item_variants_manager_manage on public.menu_item_variants for all to authenticated using (exists (select 1 from public.menu_items mi where mi.id = menu_item_id and public.has_branch_role(mi.branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]))) with check (exists (select 1 from public.menu_items mi where mi.id = menu_item_id and public.has_branch_role(mi.branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])));
create policy menu_item_modifiers_staff_select on public.menu_item_modifiers for select to authenticated using (exists (select 1 from public.menu_items mi where mi.id = menu_item_id and public.has_branch_access(mi.branch_id)));
create policy menu_item_modifiers_manager_manage on public.menu_item_modifiers for all to authenticated using (exists (select 1 from public.menu_items mi where mi.id = menu_item_id and public.has_branch_role(mi.branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]))) with check (exists (select 1 from public.menu_items mi where mi.id = menu_item_id and public.has_branch_role(mi.branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])));
create policy menu_item_availability_staff_select on public.menu_item_availability for select to authenticated using (public.has_branch_access(branch_id));
create policy menu_item_availability_manager_manage on public.menu_item_availability for all to authenticated using (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[])) with check (public.has_branch_role(branch_id, array['restaurant_owner', 'branch_manager']::public.membership_role[]));

create policy dining_sessions_staff_select on public.dining_sessions for select to authenticated using (public.has_branch_access(branch_id));
create policy kitchen_orders_staff_access on public.kitchen_orders for all to authenticated using (public.has_branch_access(branch_id)) with check (public.has_branch_access(branch_id));
create policy bills_staff_access on public.bills for all to authenticated using (public.has_branch_access(branch_id)) with check (public.has_branch_access(branch_id));
create policy kitchen_order_items_staff_access on public.kitchen_order_items for all to authenticated using (exists (select 1 from public.kitchen_orders ko where ko.id = kitchen_order_id and public.has_branch_access(ko.branch_id))) with check (exists (select 1 from public.kitchen_orders ko where ko.id = kitchen_order_id and public.has_branch_access(ko.branch_id)));
create policy bill_item_assignments_staff_access on public.bill_item_assignments for all to authenticated using (exists (select 1 from public.kitchen_order_items koi join public.bills b on b.id = koi.bill_id where koi.id = bill_item_id and public.has_branch_access(b.branch_id))) with check (exists (select 1 from public.kitchen_order_items koi join public.bills b on b.id = koi.bill_id where koi.id = bill_item_id and public.has_branch_access(b.branch_id)));
create policy payment_groups_staff_access on public.payment_groups for all to authenticated using (exists (select 1 from public.bills b where b.id = bill_id and public.has_branch_access(b.branch_id))) with check (exists (select 1 from public.bills b where b.id = bill_id and public.has_branch_access(b.branch_id)));
create policy payment_allocations_staff_access on public.payment_allocations for all to authenticated using (exists (select 1 from public.payment_groups pg join public.bills b on b.id = pg.bill_id where pg.id = payment_group_id and public.has_branch_access(b.branch_id))) with check (exists (select 1 from public.payment_groups pg join public.bills b on b.id = pg.bill_id where pg.id = payment_group_id and public.has_branch_access(b.branch_id)));
create policy payment_provider_accounts_owner_access on public.payment_provider_accounts for all to authenticated using (public.is_restaurant_member(restaurant_id)) with check (public.has_restaurant_role(restaurant_id, array['restaurant_owner']::public.membership_role[]));
create policy payment_attempts_staff_select on public.payment_attempts for select to authenticated using (exists (select 1 from public.payment_allocations pa join public.payment_groups pg on pg.id = pa.payment_group_id join public.bills b on b.id = pg.bill_id where pa.id = payment_allocation_id and public.has_branch_access(b.branch_id)));
create policy payment_webhook_events_owner_select on public.payment_webhook_events for select to authenticated using (false);
create policy audit_logs_owner_select on public.audit_logs for select to authenticated using (restaurant_id is not null and public.is_restaurant_member(restaurant_id));

commit;
