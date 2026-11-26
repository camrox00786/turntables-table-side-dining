begin;

revoke execute on function public.is_restaurant_member(uuid) from anon, authenticated;
revoke execute on function public.has_branch_access(uuid) from anon, authenticated;
revoke execute on function public.has_branch_role(uuid, public.membership_role[]) from anon, authenticated;
revoke execute on function public.has_restaurant_role(uuid, public.membership_role[]) from anon, authenticated;

create policy customer_sessions_deny_direct_access on public.customer_sessions
  for all to anon, authenticated using (false) with check (false);

create policy dining_session_members_deny_direct_access on public.dining_session_members
  for all to anon, authenticated using (false) with check (false);

commit;
