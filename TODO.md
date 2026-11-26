# Turntables foundation and hosting

## QR-first customer entry

- [x] Replace the marketing homepage with a minimal branded QR-first screen explaining that customers should scan their table QR code.
- [x] Preserve the direct customer route `/v/{restaurant-slug}/t/{table-number}?branch={branch-slug}` so scanning a table opens that restaurant's menu without homepage selection.
- [x] Keep invalid table URLs on the customer route and show a useful validation error without falling back to demo restaurant data in Supabase mode.

## Separate authenticated owner dashboard

- [x] Keep the owner dashboard at `/dashboard` as a separate route from the customer menu.
- [x] Require Supabase email/password authentication for the production dashboard and keep sign-out available.
- [x] Ensure owners see only restaurants and branches authorized by their existing memberships.
- [ ] Preserve existing production table management, QR generation, menu persistence, customer sessions, cart behavior, and server-priced order creation.

## Centralized multi-tenant foundation

- [ ] Continue using one centralized Supabase/PostgreSQL backend for multiple restaurants and branches.
- [ ] Preserve strict RLS and server-side validation of restaurant, branch, table, membership, menu, and order relationships.
- [ ] Do not add duplicate restaurants, branches, users, memberships, or database projects.

## Permanent production hosting

- [ ] Permanently host the existing React, TypeScript, Vite, and TanStack Start application.
- [ ] Configure Supabase frontend values through protected deployment environment settings, with no credentials committed.
- [ ] Keep this hosting rollout payment-free and do not change the Supabase schema.
