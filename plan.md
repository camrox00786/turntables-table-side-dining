# Turntables QR-first foundation

## Implementation approach

Replace the marketing homepage at `/` with a minimal QR-first entry screen. It will explain that customers should scan the table QR code, retain the dark premium Turntables visual language, and provide a secondary authenticated-owner link to `/dashboard`. The existing customer route `/v/$venue/t/$table?branch=$branch` remains the direct QR destination, and the existing `/dashboard` route remains the owner boundary that selects the Supabase-authenticated production dashboard when Supabase mode is enabled.

No database migration is required. Tenant isolation, branch/table validation, customer sessions, cart persistence, server-priced order creation, and existing owner membership filtering remain in the existing Supabase schema and service boundary. This phase does not add payments, delivery integrations, promotions, analytics, or new tenant workflows.

## Project structure

- `src/routes/index.tsx` owns the QR-first root experience.
- `src/routes/dashboard.tsx` owns the separate owner route and demo/production mode selection.
- `src/routes/v.$venue.t.$table.tsx` owns the customer QR menu route and delegates to the persisted Supabase menu in production mode.
- `src/components/dashboard/ProductionDashboard.tsx` owns authenticated production owner controls.
- `src/components/customer/ProductionMenuPage.tsx` owns real table validation, dining sessions, cart operations, and server-priced order creation.
- `src/lib/backend/turntables-service.ts` is the Supabase service boundary.
- `supabase/migrations/` contains versioned database changes; none are needed for this route foundation.

## Design

### Candidate styles

- QR gate / premium utility: 0.06
- Neon hospitality sign: 0.04
- Editorial restaurant placard: 0.08

### Chosen direction: QR gate / premium utility

**Design Movement:** A restrained hospitality check-in screen: dark, spacious, and tactile rather than promotional.

**Core Principles:** QR-first clarity, one primary action, strong contrast, and zero distraction from the physical table journey.

**Color Philosophy:** Keep the existing near-black surface and electric-lime primary as a recognizable signal for action, with muted text for supporting instructions.

**Layout Paradigm:** A compact centered card with a small brand lockup, a large QR glyph, concise instructions, and an owner-access link below; no feature grid or marketing hero.

**Signature Elements:** Lime ring around the QR glyph, subtle border card, and compact uppercase status label.

**Interaction Philosophy:** The root explains rather than sells. The only customer action is to scan the physical QR; owner access is deliberately secondary.

**Animation:** No required motion on the root. Any existing global motion remains scoped to routes that use it.

**Typography System:** Existing Bricolage Grotesque display face for the wordmark and heading, Manrope for readable instructions and controls.

**Brand Essence:** Turntables is the QR-to-order layer for hospitality tables: direct, branded, and frictionless. Personality: focused, premium, welcoming.

**Brand Voice:** “Scan the code on your table.” “Your menu opens here — no app download needed.”

**Wordmark & Logo:** Preserve the existing `turntables` wordmark treatment with the lime `tables` accent.

**Signature Brand Color:** Electric lime remains the unmistakable action color.
