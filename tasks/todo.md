# Task List — Domain Architecture Migration

> Generated: 2026-05-13 · Decisions applied: 2026-05-14
> Plan reference: `tasks/plan.md`
> Status legend: `[ ]` todo · `[~]` in-progress · `[x]` done · `[!]` blocked

## Locked Decisions

| ID | Decision |
|---|---|
| D1 | Single parish — one seeded row; no tenant scoping |
| D2 | Opt-in toggle visible to `role = 'admin'` only |
| D3 | `lingkungan → community` migration deferred to Phase 8 |
| D4 | `f/tatib` is a public form — no login required |

---

## Phase 0 — Feature Flag Plumbing (Done)

- [ ] **0.1** Add `featurePreference` column to `user` table; generate + apply migration
- [ ] **0.2** Add preference toggle UI in `/admin/settings` sidebar — render only when `locals.user.role === 'admin'` (D2)
- [ ] **0.3** Form action: persist `featurePreference` for logged-in user
- [ ] **0.4** On layout load: call `statsigService.updateUser` with `featurePreference`
- [ ] **0.5** Create `src/lib/server/featureFlags.ts` — `checkServerGate(locals, gate)` helper
- [ ] **0.6** Unit test for `checkServerGate` fallback behaviour

**⏸ CHECKPOINT 0** — Gate check works end-to-end, preference persists

---

## Phase 1 — New Domain Entities

- [x] **1.1** Create `src/core/entities/Parish.ts` — Parish, Wilayah, Community, CommunityWithAncestry, ChurchContext, ParishHierarchy
- [x] **1.2** Create `src/core/entities/Facility.ts` — Church (v2), Section, Zone, Station, ChurchFacility
- [x] **1.3** Create `src/core/entities/Ministry.ts` — Ministry, MinistryRole
- [x] **1.4** Create `src/core/entities/Roster.ts` — RosterStatus, Roster, RosterEntry, RosterUsher, command types
- [x] **1.5** Verify `npm run check` passes with no type errors

---

## Phase 2 — New DB Schema + Migrations

- [x] **2.1** Add `parish` table to `schema.ts` + seed one row in migration (D1)
- [x] **2.2** Add nullable `parishId` FK to `wilayah` and `church` tables
- [x] **2.3** Add `community` table (empty; D3 — no data copied from `lingkungan` until Phase 8)
- [x] **2.4** Add `section` table (parallel to `church_zone_group`)
- [x] **2.5** Add `zone` v2 table with `sectionId` FK (parallel to `church_zone`)
- [x] **2.6** Add `station` table with `ministryId` FK (parallel to `church_position`)
- [x] **2.7** Add `ministry` + `ministry_role` tables + seed data
- [x] **2.8** Add `roster`, `roster_entry`, `roster_usher` tables
- [x] **2.9** Run `npm run db:generate` + `npm run db:migrate` — verify clean run
- [x] **2.10** Verify old tables still exist in Drizzle Studio

---

## Phase 3 — Repository Interfaces

- [ ] **3.1** Create `src/core/repositories/ParishRepository.ts`
- [ ] **3.2** Create `src/core/repositories/FacilityRepository.ts`
- [ ] **3.3** Create `src/core/repositories/MinistryRepository.ts`
- [ ] **3.4** Create `src/core/repositories/RosterRepository.ts`

---

## Phase 4 — Adapter Implementations

- [ ] **4.1** Extend `SQLiteDbRegion.ts` with `findParishHierarchy`, `listCommunities`, `findCommunityById`
- [ ] **4.2** Extend `SQLiteDbFacility.ts` with `findChurchFacility`, `listStationsByZone`, `listZonesByEvent`
- [ ] **4.3** Create `src/lib/server/adapters/SQLiteDbMinistry.ts`
- [ ] **4.4** Create `src/lib/server/adapters/SQLiteDbRoster.ts` (with transactional submit + optimistic lock)
- [ ] **4.5** Update `SQLiteAdapter.ts` facade to delegate new interfaces
- [ ] **4.6** Integration tests for all four new adapters

---

## Phase 5 — Service Layer

- [ ] **5.1** Create `src/core/service/MinistryService.ts`
- [ ] **5.2** Create `src/core/service/RosterService.ts` with `applyTransition` pure function
- [ ] **5.3** Unit tests: `applyTransition` all valid + invalid transitions
- [ ] **5.4** Update `ChurchService.ts` — add `retrieveParishHierarchy()`, `retrieveChurchFacility(churchId)`
- [ ] **5.5** Integration test: `RosterService` with in-memory SQLite

**⏸ CHECKPOINT A** — Backend complete, all tests green, team review

---

## Phase 6 — Feature-Flagged Settings Pages

- [ ] **6.1** Update `admin/settings/+layout.server.ts` — check `new_settings_pages` gate
- [ ] **6.2** Update `admin/settings/+layout.svelte` — conditional nav (old vs new items)
- [ ] **6.3** Create `admin/settings/celebration/` route (CRUD for Celebration/Mass)
- [ ] **6.4** Create `admin/settings/section/` route (CRUD for Section)
- [ ] **6.5** Create `admin/settings/zone/` route (CRUD for Zone with Section parent)
- [ ] **6.6** Create `admin/settings/station/` route (CRUD for Station with Ministry dropdown)
- [ ] **6.7** Verify old settings routes still work when gate is off

---

## Phase 7 — Feature-Flagged Core Pages

- [ ] **7.1** Update `admin/tatib/[id]/+page.server.ts` — gate `new_roster_flow` → use `RosterService`
- [ ] **7.2** Update `admin/tatib/[id]/+page.svelte` — render `RosterEntry` list with status badges
- [ ] **7.3** Update `f/tatib/+page.server.ts` — gate `new_roster_flow` → `RosterService.submitEntry` (public form, no auth guard — D4)
- [ ] **7.4** Update `admin/zone/+page.server.ts` — gate `new_domain_model` → use `ChurchFacility`
- [ ] **7.5** Smoke test all four routes with gate on + gate off

**⏸ CHECKPOINT B** — QA sign-off, raise opt-in to 50% in Statsig

---

## Phase 8 — Sunset Old Code (do not start until 14 days stable at 100%)

- [ ] **8.1** Deprecate old entity interfaces in `Schedule.ts`
- [ ] **8.2** Remove `isNewUX` / gate branches from all routes
- [ ] **8.3** Run `lingkungan → community` data migration script (D3)
- [ ] **8.4** Verify community row count matches lingkungan row count
- [ ] **8.5** Write drop migration for `church_zone_group`, `church_position`, `church_zone`, `event_usher`, `lingkungan`
- [ ] **8.6** Test drop migration on DB copy
- [ ] **8.7** Apply drop migration to production
- [ ] **8.8** Archive Statsig gates

**⏸ CHECKPOINT C** — Post-migration review complete

---

## Decisions — All Resolved ✓

- [x] **D1** Single parish — one seeded row, no tenant scoping
- [x] **D2** Toggle visible to `role = 'admin'` only
- [x] **D3** `lingkungan → community` migration deferred to Phase 8
- [x] **D4** `f/tatib` is a public form (no login required)
