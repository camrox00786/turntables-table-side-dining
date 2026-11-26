begin;

create table public.customer_carts (
  id uuid primary key default gen_random_uuid(),
  dining_session_id uuid not null references public.dining_sessions(id) on delete cascade,
  customer_session_id uuid not null references public.customer_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dining_session_id, customer_session_id)
);

create table public.customer_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.customer_carts(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  variant_id uuid references public.menu_item_variants(id) on delete restrict,
  modifier_ids uuid[] not null default '{}'::uuid[],
  line_key text not null,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, line_key)
);

create index customer_carts_session_idx on public.customer_carts (dining_session_id, customer_session_id);
create index customer_cart_items_cart_idx on public.customer_cart_items (cart_id, created_at);

create trigger customer_carts_set_updated_at before update on public.customer_carts for each row execute function public.set_updated_at();
create trigger customer_cart_items_set_updated_at before update on public.customer_cart_items for each row execute function public.set_updated_at();

alter table public.customer_carts enable row level security;
alter table public.customer_cart_items enable row level security;

create or replace function public.customer_member_context(p_customer_token text, p_session_id uuid)
returns table(customer_session_id uuid, member_id uuid, branch_id uuid, table_id uuid, currency text)
language sql
security definer
set search_path = public
as $$
  select cs.id, dsm.id, ds.branch_id, ds.table_id, b.currency
  from public.customer_sessions cs
  join public.dining_session_members dsm on dsm.customer_session_id = cs.id
  join public.dining_sessions ds on ds.id = dsm.dining_session_id
  join public.branches b on b.id = ds.branch_id
  where cs.token_hash = encode(extensions.digest(convert_to(p_customer_token, 'UTF8'), 'sha256'), 'hex')
    and cs.expires_at > now()
    and cs.revoked_at is null
    and dsm.dining_session_id = p_session_id
    and dsm.status = 'active'
    and ds.status = 'open'
    and b.status = 'active'
  limit 1;
$$;

create or replace function public.open_customer_session(
  p_restaurant_slug text,
  p_branch_slug text default null,
  p_table_number integer default null,
  p_customer_token text default null,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_row public.restaurants;
  branch_row public.branches;
  table_row public.dining_tables;
  session_row public.dining_sessions;
  customer_row public.customer_sessions;
  member_row public.dining_session_members;
  token_hash_value text;
  branch_count integer;
begin
  if p_customer_token is null or length(p_customer_token) < 24 then
    raise exception 'customer_token_required' using errcode = '22023';
  end if;
  if p_table_number is null or p_table_number < 1 then
    raise exception 'table_number_required' using errcode = '22023';
  end if;

  select * into restaurant_row from public.restaurants where slug = lower(trim(p_restaurant_slug)) and status = 'active';
  if restaurant_row.id is null then raise exception 'restaurant_not_found' using errcode = 'P0002'; end if;

  if p_branch_slug is null or length(trim(p_branch_slug)) = 0 then
    select count(*) into branch_count from public.branches where restaurant_id = restaurant_row.id and status = 'active';
    if branch_count <> 1 then raise exception 'branch_required' using errcode = '22023'; end if;
    select * into branch_row from public.branches where restaurant_id = restaurant_row.id and status = 'active' order by name limit 1;
  else
    select * into branch_row from public.branches where restaurant_id = restaurant_row.id and slug = lower(trim(p_branch_slug)) and status = 'active';
  end if;
  if branch_row.id is null then raise exception 'branch_not_found' using errcode = 'P0002'; end if;

  select * into table_row from public.dining_tables where branch_id = branch_row.id and table_number = p_table_number and status = 'active';
  if table_row.id is null then raise exception 'table_not_found' using errcode = 'P0002'; end if;

  token_hash_value := encode(extensions.digest(convert_to(p_customer_token, 'UTF8'), 'sha256'), 'hex');
  select * into customer_row from public.customer_sessions where token_hash = token_hash_value and revoked_at is null and expires_at > now();
  if customer_row.id is null then
    insert into public.customer_sessions (token_hash, expires_at) values (token_hash_value, now() + interval '24 hours') returning * into customer_row;
  end if;

  select * into session_row from public.dining_sessions where branch_id = branch_row.id and table_id = table_row.id and status = 'open' order by opened_at desc limit 1;
  if session_row.id is null then
    insert into public.dining_sessions (branch_id, table_id, join_token_hash) values (branch_row.id, table_row.id, encode(extensions.digest(convert_to(gen_random_uuid()::text, 'UTF8'), 'sha256'), 'hex')) returning * into session_row;
  end if;

  insert into public.dining_session_members (dining_session_id, customer_session_id, display_name)
  values (session_row.id, customer_row.id, nullif(trim(p_display_name), ''))
  on conflict (dining_session_id, customer_session_id) do update set display_name = coalesce(excluded.display_name, public.dining_session_members.display_name)
  returning * into member_row;

  return jsonb_build_object(
    'session_id', session_row.id,
    'member_id', member_row.id,
    'restaurant_id', restaurant_row.id,
    'restaurant_name', restaurant_row.name,
    'restaurant_slug', restaurant_row.slug,
    'branch_id', branch_row.id,
    'branch_name', branch_row.name,
    'branch_slug', branch_row.slug,
    'table_id', table_row.id,
    'table_number', table_row.table_number,
    'currency', branch_row.currency
  );
end;
$$;

create or replace function public.get_customer_cart(p_customer_token text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  context_row record;
  cart_row public.customer_carts;
begin
  select * into context_row from public.customer_member_context(p_customer_token, p_session_id);
  if context_row.member_id is null then raise exception 'customer_session_invalid' using errcode = '42501'; end if;
  select * into cart_row from public.customer_carts where dining_session_id = p_session_id and customer_session_id = context_row.customer_session_id;
  if cart_row.id is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', cci.id,
    'menu_item_id', cci.menu_item_id,
    'variant_id', cci.variant_id,
    'modifier_ids', cci.modifier_ids,
    'quantity', cci.quantity,
    'name', mi.name,
    'price_minor', mi.price_minor,
    'available', mi.available
  ) order by cci.created_at) from public.customer_cart_items cci join public.menu_items mi on mi.id = cci.menu_item_id where cci.cart_id = cart_row.id), '[]'::jsonb);
end;
$$;

create or replace function public.add_customer_cart_item(
  p_customer_token text,
  p_session_id uuid,
  p_menu_item_id uuid,
  p_quantity integer default 1,
  p_variant_id uuid default null,
  p_modifier_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  context_row record;
  cart_row public.customer_carts;
  item_row public.menu_items;
  line_key_value text;
  modifier_key text;
  existing_quantity integer;
begin
  select * into context_row from public.customer_member_context(p_customer_token, p_session_id);
  if context_row.member_id is null then raise exception 'customer_session_invalid' using errcode = '42501'; end if;
  if p_quantity < 1 or p_quantity > 99 then raise exception 'invalid_quantity' using errcode = '22023'; end if;

  select * into item_row from public.menu_items where id = p_menu_item_id and branch_id = context_row.branch_id and status = 'active' and available = true;
  if item_row.id is null then raise exception 'menu_item_unavailable' using errcode = 'P0002'; end if;
  if p_variant_id is not null and not exists (select 1 from public.menu_item_variants where id = p_variant_id and menu_item_id = p_menu_item_id and status = 'active') then raise exception 'variant_not_found' using errcode = 'P0002'; end if;
  if cardinality(p_modifier_ids) > 0 and (select count(*) from public.menu_item_modifiers where id = any(p_modifier_ids) and menu_item_id = p_menu_item_id and status = 'active') <> cardinality(p_modifier_ids) then raise exception 'modifier_not_found' using errcode = 'P0002'; end if;

  insert into public.customer_carts (dining_session_id, customer_session_id) values (p_session_id, context_row.customer_session_id)
  on conflict (dining_session_id, customer_session_id) do update set updated_at = now()
  returning * into cart_row;
  modifier_key := coalesce(array_to_string((select array_agg(x order by x) from unnest(p_modifier_ids) x), ','), '');
  line_key_value := p_menu_item_id::text || ':' || coalesce(p_variant_id::text, '') || ':' || modifier_key;
  insert into public.customer_cart_items (cart_id, menu_item_id, variant_id, modifier_ids, line_key, quantity)
  values (cart_row.id, p_menu_item_id, p_variant_id, p_modifier_ids, line_key_value, p_quantity)
  on conflict (cart_id, line_key) do update set quantity = least(99, public.customer_cart_items.quantity + excluded.quantity), updated_at = now();
  return public.get_customer_cart(p_customer_token, p_session_id);
end;
$$;

create or replace function public.place_customer_order(p_customer_token text, p_session_id uuid, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  context_row record;
  cart_row public.customer_carts;
  order_row public.kitchen_orders;
  bill_row public.bills;
  cart_item record;
  item_row public.menu_items;
  variant_price integer;
  modifier_price integer;
  unit_price integer;
  line_total integer;
  order_total integer := 0;
  item_count integer := 0;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'idempotency_key_required' using errcode = '22023'; end if;
  select * into context_row from public.customer_member_context(p_customer_token, p_session_id);
  if context_row.member_id is null then raise exception 'customer_session_invalid' using errcode = '42501'; end if;
  select * into order_row from public.kitchen_orders where branch_id = context_row.branch_id and idempotency_key = p_idempotency_key;
  if order_row.id is not null then return jsonb_build_object('order_id', order_row.id, 'order_number', order_row.order_number, 'status', order_row.status); end if;
  select * into cart_row from public.customer_carts where dining_session_id = p_session_id and customer_session_id = context_row.customer_session_id;
  if cart_row.id is null then raise exception 'cart_empty' using errcode = '22023'; end if;

  for cart_item in select * from public.customer_cart_items where cart_id = cart_row.id order by created_at loop
    select * into item_row from public.menu_items where id = cart_item.menu_item_id and branch_id = context_row.branch_id and status = 'active' and available = true;
    if item_row.id is null then raise exception 'menu_item_unavailable' using errcode = 'P0002'; end if;
    select coalesce(price_minor, 0) into variant_price from public.menu_item_variants where id = cart_item.variant_id and menu_item_id = item_row.id and status = 'active';
    select coalesce(sum(price_minor), 0) into modifier_price from public.menu_item_modifiers where id = any(cart_item.modifier_ids) and menu_item_id = item_row.id and status = 'active';
    unit_price := item_row.price_minor + coalesce(variant_price, 0) + coalesce(modifier_price, 0);
    line_total := unit_price * cart_item.quantity;
    order_total := order_total + line_total;
    item_count := item_count + cart_item.quantity;
  end loop;
  if item_count = 0 then raise exception 'cart_empty' using errcode = '22023'; end if;

  insert into public.kitchen_orders (dining_session_id, branch_id, status, idempotency_key)
  values (p_session_id, context_row.branch_id, 'pending_payment', p_idempotency_key)
  returning * into order_row;
  insert into public.bills (dining_session_id, branch_id, currency, subtotal_minor, total_minor, outstanding_minor, status)
  values (p_session_id, context_row.branch_id, context_row.currency, order_total, order_total, order_total, 'proposed')
  on conflict (dining_session_id) do update set subtotal_minor = public.bills.subtotal_minor + excluded.subtotal_minor, total_minor = public.bills.total_minor + excluded.total_minor, outstanding_minor = public.bills.outstanding_minor + excluded.outstanding_minor, updated_at = now()
  returning * into bill_row;

  for cart_item in select * from public.customer_cart_items where cart_id = cart_row.id order by created_at loop
    select * into item_row from public.menu_items where id = cart_item.menu_item_id;
    select coalesce(price_minor, 0) into variant_price from public.menu_item_variants where id = cart_item.variant_id and menu_item_id = item_row.id and status = 'active';
    select coalesce(sum(price_minor), 0) into modifier_price from public.menu_item_modifiers where id = any(cart_item.modifier_ids) and menu_item_id = item_row.id and status = 'active';
    unit_price := item_row.price_minor + coalesce(variant_price, 0) + coalesce(modifier_price, 0);
    insert into public.kitchen_order_items (kitchen_order_id, bill_id, added_by_member_id, menu_item_id, variant_id, item_name_snapshot, unit_price_minor_snapshot, quantity, modifiers_snapshot, line_total_minor)
    values (order_row.id, bill_row.id, context_row.member_id, item_row.id, cart_item.variant_id, item_row.name, unit_price, cart_item.quantity, to_jsonb(cart_item.modifier_ids), unit_price * cart_item.quantity);
  end loop;
  delete from public.customer_cart_items where cart_id = cart_row.id;
  return jsonb_build_object('order_id', order_row.id, 'order_number', order_row.order_number, 'status', order_row.status, 'total_minor', order_total, 'currency', context_row.currency);
end;
$$;

revoke all on function public.customer_member_context(text, uuid) from public, anon, authenticated;
revoke all on function public.open_customer_session(text, text, integer, text, text) from public, authenticated;
revoke all on function public.get_customer_cart(text, uuid) from public, authenticated;
revoke all on function public.add_customer_cart_item(text, uuid, uuid, integer, uuid, uuid[]) from public, authenticated;
revoke all on function public.place_customer_order(text, uuid, text) from public, authenticated;
grant execute on function public.open_customer_session(text, text, integer, text, text) to anon, authenticated;
grant execute on function public.get_customer_cart(text, uuid) to anon, authenticated;
grant execute on function public.add_customer_cart_item(text, uuid, uuid, integer, uuid, uuid[]) to anon, authenticated;
grant execute on function public.place_customer_order(text, uuid, text) to anon, authenticated;

commit;
