begin;

create unique index if not exists dining_tables_branch_number_unique
  on public.dining_tables (branch_id, table_number)
  where status <> 'archived';

commit;
