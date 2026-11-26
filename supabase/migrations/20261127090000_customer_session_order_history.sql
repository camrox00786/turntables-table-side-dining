begin;

create or replace function public.update_customer_cart_item(
  p_customer_token text,
  p_session_id uuid,
  p_cart_item_id uuid,
  p_quantity integer
)
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
  if p_quantity < 1 or p_quantity > 99 then raise exception 'invalid_quantity' using errcode = '22023'; end if;
  select * into cart_row from public.customer_carts
    where dining_session_id = p_session_id and customer_session_id = context_row.customer_session_id;
  if cart_row.id is null then raise exception 'cart_not_found' using errcode = 'P0002'; end if;
  update public.customer_cart_items
    set quantity = p_quantity, updated_at = now()
    where id = p_cart_item_id and cart_id = cart_row.id;
  if not found then raise exception 'cart_item_not_found' using errcode = 'P0002'; end if;
  return public.get_customer_cart(p_customer_token, p_session_id);
end;
$$;

create or replace function public.remove_customer_cart_item(
  p_customer_token text,
  p_session_id uuid,
  p_cart_item_id uuid
)
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
  select * into cart_row from public.customer_carts
    where dining_session_id = p_session_id and customer_session_id = context_row.customer_session_id;
  if cart_row.id is null then raise exception 'cart_not_found' using errcode = 'P0002'; end if;
  delete from public.customer_cart_items where id = p_cart_item_id and cart_id = cart_row.id;
  if not found then raise exception 'cart_item_not_found' using errcode = 'P0002'; end if;
  return public.get_customer_cart(p_customer_token, p_session_id);
end;
$$;

create or replace function public.get_customer_session_orders(p_customer_token text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  context_row record;
begin
  select * into context_row from public.customer_member_context(p_customer_token, p_session_id);
  if context_row.member_id is null then raise exception 'customer_session_invalid' using errcode = '42501'; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'order_id', ko.id,
        'order_number', ko.order_number,
        'status', ko.status::text,
        'placed_at', ko.placed_at,
        'total_minor', coalesce((
          select sum(koi.line_total_minor)
          from public.kitchen_order_items koi
          where koi.kitchen_order_id = ko.id
        ), 0),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', koi.id,
            'item_name', koi.item_name_snapshot,
            'quantity', koi.quantity,
            'unit_price_minor', koi.unit_price_minor_snapshot,
            'line_total_minor', koi.line_total_minor,
            'added_by_member_id', koi.added_by_member_id
          ) order by koi.created_at)
          from public.kitchen_order_items koi
          where koi.kitchen_order_id = ko.id
        ), '[]'::jsonb)
      ) order by ko.placed_at desc
    )
    from public.kitchen_orders ko
    where ko.dining_session_id = p_session_id
      and ko.branch_id = context_row.branch_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.update_customer_cart_item(text, uuid, uuid, integer) from public, authenticated;
revoke all on function public.remove_customer_cart_item(text, uuid, uuid) from public, authenticated;
revoke all on function public.get_customer_session_orders(text, uuid) from public, authenticated;
grant execute on function public.update_customer_cart_item(text, uuid, uuid, integer) to anon, authenticated;
grant execute on function public.remove_customer_cart_item(text, uuid, uuid) to anon, authenticated;
grant execute on function public.get_customer_session_orders(text, uuid) to anon, authenticated;

commit;
