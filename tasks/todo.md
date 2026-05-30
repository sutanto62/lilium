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

## Phase 0 — Feature Flag Plumbing

- [x] **0.1** Add `featurePreference` column to `user` table; generate + apply migration
- [x] **0.2** Add preference toggle UI in `/admin/settings` sidebar — render only when `locals.user.role === 'admin'` (D2)
- [x] **0.3** Form action: persist `featurePreference` for logged-in user
- [x] **0.4** On layout load: call `statsigService.updateUser` with `featurePreference`
- [x] **0.5** Create `src/lib/server/featureFlags.ts` — `checkServerGate(locals, gate)` helper
- [x] **0.6** Unit test for `checkServerGate` fallback behaviour
- [x] **0.7** Gate the featurePreference toggle visibility on `new_domain_model` — toggle shown only when gate is true; currently shows to all admins regardless of eligibility

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

- [x] **3.1** Create `src/core/repositories/ParishRepository.ts`
- [x] **3.2** Create `src/core/repositories/FacilityRepository.ts`
- [x] **3.3** Create `src/core/repositories/MinistryRepository.ts`
- [x] **3.4** Create `src/core/repositories/RosterRepository.ts`

---

## Phase 4 — Adapter Implementations

- [x] **4.1** Extend `SQLiteDbRegion.ts` with `findParishHierarchy`, `listCommunities`, `findCommunityById`
- [x] **4.2** Extend `SQLiteDbFacility.ts` with `findChurchFacility`, `listStationsByZone`, `listZonesByEvent`
- [x] **4.3** Create `src/lib/server/adapters/SQLiteDbMinistry.ts`
- [x] **4.4** Create `src/lib/server/adapters/SQLiteDbRoster.ts` (with transactional submit + optimistic lock)
- [x] **4.5** Update `SQLiteAdapter.ts` facade to delegate new interfaces
- [x] **4.6** Integration tests for all four new adapters

---

## Phase 5 — Service Layer

- [x] **5.1** Create `src/core/service/MinistryService.ts`
- [x] **5.2** Create `src/core/service/RosterService.ts` with `applyTransition` pure function
- [x] **5.3** Unit tests: `applyTransition` all valid + invalid transitions
- [x] **5.4** Update `ChurchService.ts` — add `retrieveParishHierarchy()`, `retrieveChurchFacility(churchId)`
- [x] **5.5** Integration test: `RosterService` with in-memory SQLite

**⏸ CHECKPOINT A** — Backend complete, all tests green, team review

---

## Phase 6 — Feature-Flagged Settings Pages

- [x] **6.1** Update `admin/settings/+layout.server.ts` — check `new_settings_pages` gate
- [x] **6.2** Update `admin/settings/+layout.svelte` — conditional nav (old vs new items)
- [x] **6.3** Create `admin/settings/celebration/` route (CRUD for Celebration/Mass)
- [x] **6.4** Create `admin/settings/section/` route (CRUD for Section)
- [x] **6.5** Create `admin/settings/zone/` route (CRUD for Zone with Section parent)
- [x] **6.6** Create `admin/settings/station/` route (CRUD for Station with Ministry dropdown)
- [x] **6.7** Verify old settings routes still work when gate is off (gate-off redirects implemented in each route)

### Phase 6.5 — Community (Lingkungan) Settings Page

- [x] **L1** Add `CreateCommunityInput` type + `createCommunity`, `updateCommunity`, `deactivateCommunity` signatures to `src/core/repositories/ParishRepository.ts`
- [x] **L2** Implement `getParishIdByChurch`, `createCommunity`, `updateCommunity`, `deactivateCommunity` in `src/lib/server/adapters/SQLiteDbRegion.ts`
- [x] **L3** Delegate four new methods in `src/lib/server/adapters/SQLiteAdapter.ts` + import from `SQLiteDbRegion`
- [x] **L4** Add `{ label: 'Wilayah & Lingkungan', href: '/admin/settings/lingkungan' }` to `NEW_MENU_ITEMS` in `src/routes/admin/settings/+layout.svelte`
- [x] **L5** Create `src/routes/admin/settings/lingkungan/+page.server.ts` — gate guard + load + create/update/delete actions
- [x] **L6** Create `src/routes/admin/settings/lingkungan/+page.svelte` — table (wilayah | nama | urutan | aksi) + create/edit modal + delete modal

**⏸ CHECKPOINT 6.x** — `npm run check` passes; gate-on shows page; gate-off redirects to `/admin/settings`

### Phase 6.6 — Parish & Wilayah Settings Page

- [x] **P1** Add `CreateWilayahInput` type + `findParishById`, `updateParish`, `createWilayah`, `updateWilayah`, `deactivateWilayah` signatures to `src/core/repositories/ParishRepository.ts`
- [x] **P2** Implement `findParishById`, `updateParish`, `createWilayah`, `updateWilayah`, `deactivateWilayah` in `src/lib/server/adapters/SQLiteDbRegion.ts`
- [x] **P3** Delegate five new methods in `src/lib/server/adapters/SQLiteAdapter.ts`
- [x] **P4** Add `{ label: 'Paroki', href: '/admin/settings/parish' }` as first item in `NEW_MENU_ITEMS` in `src/routes/admin/settings/+layout.svelte`
- [x] **P5** Create `src/routes/admin/settings/parish/+page.server.ts` — gate guard + load + updateParish / createWilayah / updateWilayah / deleteWilayah actions
- [x] **P6** Create `src/routes/admin/settings/parish/+page.svelte` — parish edit card (nama + kode) + wilayah table (nama | kode | urutan | aksi) + create/edit modal + delete confirmation modal

**⏸ CHECKPOINT 6.6** — `npm run check` passes; gate-on shows parish edit card + wilayah table; gate-off redirects to `/admin/settings`; no regressions on lingkungan/section/zone/station

### Phase 6.7 — Church Entity Integration (admin/settings/parish)

- [x] **C1** Create `apps/drizzle/0004_backfill_church_parish_id.sql` + add journal entry — backfill `church.parish_id = 'parish-1'` for all rows with `parish_id IS NULL`
- [x] **C2** Add `findFacilityChurchById` + `updateFacilityChurch` signatures to `src/core/repositories/FacilityRepository.ts`
- [x] **C3** Implement `findFacilityChurchById` + `updateFacilityChurch` in `src/lib/server/adapters/SQLiteDbFacility.ts`
- [x] **C4** Delegate both methods in `src/lib/server/adapters/SQLiteAdapter.ts`
- [x] **C5** Update `admin/settings/parish/+page.server.ts` — extend load to return `church: FacilityChurch | null`; add `updateChurch` action with analytics
- [x] **C6** Update `admin/settings/parish/+page.svelte` — Church Info Card (Nama/Kode/Kolekte Khusus) above Parish card; in-place edit form
- [x] **C7** Regenerate `doc/events-scan-report.md` — now includes all new events (admin_church_update, admin_lingkungan_*, admin_wilayah_*, admin_parish_*); 139 total events

**⏸ CHECKPOINT 6.7** — `npm run db:migrate` clean; `npm run check` passes; Church card shows above Parish card; `?/updateChurch` persists; no regressions

---

## Phase 7 — Feature-Flagged Core Pages

- [x] **7.0** Create/align `admin/roster/+page.server.ts` — gate `new_roster_flow`; community table authoritative (no lingkungan fallback); manual + XLSX creation modes
- [x] **7.1** Update `admin/tatib/[id]/+page.server.ts` — gate `new_roster_flow` → use `RosterService`
- [x] **7.2** Update `admin/tatib/[id]/+page.svelte` — render `RosterEntry` list with status badges
- [x] **7.3** Update `f/tatib/+page.server.ts` — gate `new_roster_flow` → `RosterService.submitEntry` (public form, no auth guard — D4)
- [x] **7.4** Update `admin/zone/+page.server.ts` — gate `new_domain_model` → use `ChurchFacility`
- [x] **7.5** Smoke test all five routes with gate on + gate off

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
