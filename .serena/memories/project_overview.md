# Lilium Inter Spinas — Project Overview

**Purpose**: Church service information system for the Catholic community (Indonesian UI).
**Features**: Event management, usher scheduling, RSVP/confirmation.
**Roles**: admin, usher, visitor.

## Tech Stack
- SvelteKit 5 (runes only: `$props`, `$state`, `$derived`, `$effect`)
- TypeScript (no `any`, explicit return types, `import type`)
- Drizzle ORM + SQLite (WAL mode, soft-delete with `active: 0`)
- Auth: `@auth/sveltekit` (Google + Microsoft Entra ID) + CASL
- Analytics: Statsig (feature flags + server events) + PostHog (client autocapture)
- Testing: Vitest (unit) + Playwright (e2e)

## Structure
- `apps/` — SvelteKit app
- `api/` — Go + Gin

## Key Commands (run from `apps/`)
```bash
npm run dev          # Dev server
npm run check        # Type-check
npm run lint         # ESLint + Prettier check
npm run format       # Format
npm run test         # All tests
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
```

## Architecture
Clean Architecture — core (entities, repositories, services) never imports from lib/ or routes/.
Path aliases: `$core`, `$src`, `$components`, `$adapters`

## Feature Gate Pattern (settings pages)
Layout server (`+layout.server.ts`) loads three values via `Promise.all`:
- `isNewDomainEligible` — gate: `new_domain_model` (eligibility ceiling)
- `isNewUX` — gate: `new_settings_pages` (nav visibility, child of new_domain_model)
- `featurePreference` — user's opted-in feature preference

Child pages call `event.parent()` to get these without a second DB read.
- Pages gated on new domain model: check `isNewDomainEligible && featurePreference === 'new_domain'`
- Pages gated only on new nav UX: check `isNewUX`
