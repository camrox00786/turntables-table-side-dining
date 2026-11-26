begin;

-- RLS policies call these SECURITY DEFINER helpers for authenticated staff reads/writes.
-- Keep anonymous callers excluded; restore execution only for authenticated users.
grant execute on function public.is_restaurant_member(uuid) to authenticated;
grant execute on function public.has_branch_access(uuid) to authenticated;
grant execute on function public.has_branch_role(uuid, public.membership_role[]) to authenticated;
grant execute on function public.has_restaurant_role(uuid, public.membership_role[]) to authenticated;

commit;
