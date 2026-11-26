begin;

create policy customer_carts_no_direct_access on public.customer_carts
  for all to anon, authenticated
  using (false)
  with check (false);

create policy customer_cart_items_no_direct_access on public.customer_cart_items
  for all to anon, authenticated
  using (false)
  with check (false);

commit;
