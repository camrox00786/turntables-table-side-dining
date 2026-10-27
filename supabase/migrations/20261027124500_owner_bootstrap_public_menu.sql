begin;

create policy restaurants_public_read on public.restaurants
  for select to anon, authenticated
  using (status = 'active');

create policy branches_public_read on public.branches
  for select to anon, authenticated
  using (status = 'active' and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'active'));

create policy menu_categories_public_read on public.menu_categories
  for select to anon, authenticated
  using (status = 'active' and exists (select 1 from public.branches b where b.id = branch_id and b.status = 'active'));

create policy menu_items_public_read on public.menu_items
  for select to anon, authenticated
  using (status = 'active' and available = true and exists (select 1 from public.branches b where b.id = branch_id and b.status = 'active'));

create policy menu_item_variants_public_read on public.menu_item_variants
  for select to anon, authenticated
  using (status = 'active' and exists (select 1 from public.menu_items mi join public.branches b on b.id = mi.branch_id where mi.id = menu_item_id and mi.status = 'active' and mi.available = true and b.status = 'active'));

create policy menu_item_modifiers_public_read on public.menu_item_modifiers
  for select to anon, authenticated
  using (status = 'active' and exists (select 1 from public.menu_items mi join public.branches b on b.id = mi.branch_id where mi.id = menu_item_id and mi.status = 'active' and mi.available = true and b.status = 'active'));

create or replace function public.bootstrap_restaurant_owner(
  p_restaurant_name text,
  p_restaurant_slug text,
  p_branch_name text,
  p_branch_slug text,
  p_timezone text default 'Asia/Kolkata',
  p_currency text default 'INR'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  restaurant_row public.restaurants;
  branch_row public.branches;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if length(trim(p_restaurant_name)) < 2 or length(trim(p_branch_name)) < 2 then
    raise exception 'restaurant_and_branch_names_required' using errcode = '22023';
  end if;
  if p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_currency' using errcode = '22023';
  end if;
  if exists (select 1 from public.staff_memberships where staff_user_id = current_user_id) then
    raise exception 'owner_already_bootstrapped' using errcode = '23505';
  end if;
  if exists (select 1 from public.restaurants where slug = p_restaurant_slug) then
    raise exception 'restaurant_slug_taken' using errcode = '23505';
  end if;

  insert into public.staff_users (id, display_name)
  values (current_user_id, coalesce(auth.jwt() ->> 'email', 'Owner'))
  on conflict (id) do update set status = 'active', updated_at = now();

  insert into public.restaurants (name, slug)
  values (trim(p_restaurant_name), lower(trim(p_restaurant_slug)))
  returning * into restaurant_row;

  insert into public.branches (restaurant_id, name, slug, timezone, currency)
  values (restaurant_row.id, trim(p_branch_name), lower(trim(p_branch_slug)), p_timezone, p_currency)
  returning * into branch_row;

  insert into public.staff_memberships (staff_user_id, restaurant_id, branch_id, role)
  values (current_user_id, restaurant_row.id, null, 'restaurant_owner'),
         (current_user_id, restaurant_row.id, branch_row.id, 'branch_manager');

  return jsonb_build_object(
    'restaurant_id', restaurant_row.id,
    'restaurant_name', restaurant_row.name,
    'branch_id', branch_row.id,
    'branch_name', branch_row.name,
    'branch_slug', branch_row.slug
  );
end;
$$;

revoke all on function public.bootstrap_restaurant_owner(text, text, text, text, text, text) from public, anon;
grant execute on function public.bootstrap_restaurant_owner(text, text, text, text, text, text) to authenticated;

commit;
