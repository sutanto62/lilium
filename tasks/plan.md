# Plan: Rebuild Web App with Feature-Flagged Architecture Migration

> Status: **In Progress** — Phase 7 complete, Phase 8 blocked (14-day stability gate)
> Last updated: 2026-05-17
> Author: Claude Code (planning session)

---

## Context

**Project:** Lilium Inter Spinas — Catholic parish scheduling system (SvelteKit 5 + TypeScript + SQLite/Drizzle)
**Goal:** Rebuild the domain model with a cleaner architecture (per `design-pattern.md` + `migrate.md`) while using Statsig feature gates to let users opt into the new experience incrementally.

### What changes

| Axis | Old | New |
|---|---|---|
| Physical space | `ChurchZoneGroup` → `ChurchZone` → `ChurchPosition` | `Section` → `Zone` → `Station` |
| Territorial | `Wilayah` → `Lingkungan` | `Wilayah` → `Community` (same tables, new interfaces) |
| Top-level admin | `church` (has implicit `parish` text field) | `Parish` entity + `church` FK to `parish` |
| Ministry catalog | Boolean flags: `isPpg`, `isKolekte`; enum `type: 'usher'\|'prodiakon'\|'peta'` | `Ministry` rows (Type Object) + `MinistryRole` sub-catalog |
| Scheduling artefact | `event_usher` rows (flat) | `Roster` Aggregate Root with `RosterEntry` + `RosterUsher` |

### What stays the same

- SvelteKit 5 + Drizzle ORM + SQLite database file
- Statsig for feature flags (already integrated via `StatsigService`)
- Auth layer (`auth.ts`, `user` table)
- PostHog analytics
- Tailwind + Flowbite UI components

---

## Assumptions

1. The existing SQLite database is kept; new tables are **added alongside** old tables.
2. Old routes remain fully functional until the feature flag is 100% rolled out.
3. A user can explicitly opt in/out via a toggle in the admin UI (persisted in `user` table) — the toggle is only visible when `new_domain_model` gate is true for that user.
4. Statsig gates are the _mechanism_ for rollout; user preference is the _trigger_ for opt-in.
5. Data migration (copying old rows to new schema) is a **separate follow-up task** after the new schema is fully verified.
6. No Go API changes are in scope (`api/` is read-only for this plan).

---

## Architecture: Feature Flag Strategy

```
Statsig enables new_domain_model for eligible users (by role, user list, or % rollout)
    │
    └─ Server-side load() checks new_domain_model gate
           │
           ├─ false → old domain always; toggle hidden in /admin/settings
           │
           └─ true  → toggle shown in /admin/settings
                          │
                          ├─ featurePreference = 'new_domain'  → new domain UX
                          │       child gates (new_settings_pages, new_roster_flow) open
                          │
                          └─ featurePreference ≠ 'new_domain' → old domain UX
                                  (eligible but not yet opted in)
```

Access pattern enforced in every protected load():
```
can_access = checkServerGate(gate) AND featurePreference === 'new_domain'
```

> **`new_domain` vs `new_domain_model`:**
> - `new_domain` — the string value stored in `user.featurePreference`. It is the user's explicit opt-in choice, set via the toggle.
> - `new_domain_model` — a Statsig gate controlled by Statsig rules (role, user list, % rollout). It is the **eligibility ceiling**, evaluated independently of `featurePreference`.
>
> The two are **not coupled** in Statsig's rule evaluation. Code must check both: `checkServerGate('new_domain_model') AND featurePreference === 'new_domain'`. Never use `new_domain` as a gate name.

Three Statsig gates used across phases:

| Gate | Parent | Controls |
|---|---|---|
| `new_domain_model` | — (root) | New entity interfaces + adapters; community table as authoritative source |
| `new_settings_pages` | `new_domain_model` | Settings CRUD pages (data-misa, data-zona → Celebration, Section/Zone/Station) |
| `new_roster_flow` | `new_domain_model` | Roster creation, admin tatib, and public usher submission |

---

## Dependency Graph

```
Phase 0: Feature Flag Plumbing
    └─ Phase 1: New Domain Entities (no DB yet)
        └─ Phase 2: New DB Schema + Migrations
            └─ Phase 3: New Repository Interfaces
                └─ Phase 4: New Adapter Implementations
                    └─ Phase 5: New Service Layer
                        ├─ Phase 6: Feature-Flagged Settings Pages (CHECKPOINT A)
                        └─ Phase 7: Feature-Flagged Core Pages (CHECKPOINT B)
                            └─ Phase 8: Sunset Old Code (CHECKPOINT C)
```

---

## Phase 0 — Feature Flag Plumbing

**Goal:** Wire user opt-in preference to Statsig so server-side `load()` functions can branch by gate.

### Task 0.1 — User preference storage

**Vertical slice:** Preference toggle (admin-only) → persisted → Statsig user metadata updated

- Add `featurePreference: text('feature_preference')` column to `user` table in `schema.ts`
- Generate + apply migration
- Add preference toggle to admin settings sidebar (rendered only when `locals.user.role === 'admin'`)
- Form action: update `featurePreference` for the logged-in admin user
- On admin layout load: call `statsigService.updateUser({ custom: { featurePreference } })`

**Acceptance criteria:**
- [x] Toggle visible only to users with `role = 'admin'`; invisible to `role = 'user'`
- [x] Preference persists across sessions (stored in `user` table, not `localStorage`)
- [x] `statsigService.checkGate('new_domain_model')` returns `true` for opted-in admin in Statsig console

**Verification:** Manual test — flip toggle as admin, reload, check Statsig diagnostics panel.

---

### Task 0.2 — Server-side gate check helper

**Vertical slice:** A reusable `checkServerGate(locals, gateName)` helper for `+page.server.ts` files

- Create `src/lib/server/featureFlags.ts`
- Export `async function checkServerGate(locals: App.Locals, gate: string): Promise<boolean>`
- Uses `StatsigServer` (Node SDK) initialized with `STATSIG_SERVER_KEY` env var
- Falls back to `false` on missing key (dev safety)

**Acceptance criteria:**
- [x] Function importable in any `+page.server.ts`
- [x] Returns consistent result matching client-side `checkGate`

**Verification:** Unit test in `src/lib/server/__tests__/featureFlags.test.ts`.

---

**CHECKPOINT 0 ✅:** Gate check works end-to-end. User preference is persisted. Get team sign-off before building domain layer.

---

## Phase 1 — New Domain Entities (pure TypeScript, no DB)

**Goal:** Define the new type system described in `design-pattern.md`. No runtime behaviour yet.

### Task 1.1 — Territorial hierarchy entities

File: `src/core/entities/Parish.ts`

Interfaces: `Parish`, `Wilayah`, `Community`, `CommunityWithAncestry`, `ChurchContext`, `ParishHierarchy`

> **D1 implication:** `Parish` interface is present for completeness but the app always operates against the single seeded row. No tenant-scoping generics needed. `ChurchContext` does not need a `parishId` discriminator in practice.

**Acceptance criteria:**
- [x] File compiles with `npm run check`
- [x] No import of `ChurchZoneGroup` / `Lingkungan` / `church_zone` in this file

### Task 1.2 — Physical hierarchy entities

File: `src/core/entities/Facility.ts`

Interfaces: `Church` (new, with `parishId`), `Section`, `Zone`, `Station`, `ChurchFacility`

Note: new `Church` interface intentionally differs from old `Schedule.ts:Church` — old type stays to avoid breaking existing code.

**Acceptance criteria:**
- [x] File compiles cleanly
- [x] `Station` has `ministryId` (FK to Ministry) not boolean `isPpg`

### Task 1.3 — Ministry catalog entities

File: `src/core/entities/Ministry.ts`

Interfaces: `Ministry`, `MinistryRole`

**Acceptance criteria:**
- [x] No boolean flags (`isPpg`, `isKolekte`) — replaced by `MinistryRole.code`
- [x] `Ministry.requiresStation: boolean` present

### Task 1.4 — Roster aggregate entities

File: `src/core/entities/Roster.ts`

Interfaces + types: `RosterStatus`, `Roster`, `RosterEntry`, `RosterUsher`, `CreateRosterCommand`, `SubmitRosterEntryCommand`, `ConfirmRosterEntryCommand`

**Acceptance criteria:**
- [x] `RosterEntry` has `communityName` + `wilayahName` snapshot fields
- [x] `Roster.version: number` present (optimistic lock)
- [x] `applyTransition` pure function (no I/O) compilable in this file or `RosterService.ts`

---

## Phase 2 — New DB Schema + Migrations

**Goal:** Add new tables to `schema.ts` without removing old ones.

### Task 2.1 — Territorial + physical schema tables

Add to `src/lib/server/db/schema.ts`:
- `parish` table — **seeded with one row** at migration time (single-parish decision D1)
- Update `wilayah` to add `parishId` FK (nullable for backward compatibility with existing rows)
- `community` table — **starts empty** (D3: old `lingkungan` rows not copied until Phase 8)
- `section` table (parallel to `church_zone_group`, not replacing it)
- `zone` v2 with `sectionId` FK (parallel to `church_zone`)
- `station` with `ministryId` FK (parallel to `church_position`)

Update `church` table to add `parishId` nullable FK pointing to the single parish row.

Generate migration: `npm run db:generate`

**Acceptance criteria:**
- [x] `npm run db:migrate` runs without error on fresh DB
- [x] `SELECT COUNT(*) FROM parish` = 1 immediately after migration (seed row present)
- [x] Old tables (`church_zone_group`, `lingkungan`) still present (no drop)
- [x] `community` table exists but is empty (D3)

### Task 2.2 — Ministry catalog tables

Add: `ministry`, `ministry_role` tables + seed data

Seed rows:
```
Ministry: USHER, PRODIAKON, PETA, EMHC
MinistryRole: REGULAR, KOLEKTE, PPG, PPKG (under USHER)
```

**Acceptance criteria:**
- [x] `npm run db:migrate` inserts seed rows
- [x] `SELECT * FROM ministry` returns 4 rows in Drizzle Studio

### Task 2.3 — Roster tables

Add: `roster`, `roster_entry`, `roster_usher` tables

Note: `station` table replaces `church_position`; `station` has `ministryId` FK.

**Acceptance criteria:**
- [x] `npm run db:migrate` runs cleanly
- [x] All FK references resolve (no dangling references)

---

## Phase 3 — Repository Interfaces

**Goal:** Define the port (interface) contracts the adapters must implement.

### Task 3.1 — Parish + Facility repositories

Files:
- `src/core/repositories/ParishRepository.ts` — `findParishHierarchy`, `listCommunities`, `findCommunityById`
- `src/core/repositories/FacilityRepository.ts` — `findChurchFacility`, `listStationsByZone`, `listZonesByEvent`

**Acceptance criteria:**
- [x] Interfaces use only types from Phase 1 entity files
- [x] No Drizzle imports

### Task 3.2 — Ministry + Roster repositories

Files:
- `src/core/repositories/MinistryRepository.ts` — `listMinistries`, `listRolesByMinistry`, `findRoleByCode`
- `src/core/repositories/RosterRepository.ts` — `createRoster`, `loadRoster`, `submitEntry`, `confirmEntry`, `reopenEntry`, `listByCommunity`

**Acceptance criteria:**
- [x] Method signatures match commands defined in `Roster.ts`

---

## Phase 4 — Adapter Implementations

**Goal:** Implement the new repository interfaces against the new schema tables.

### Task 4.1 — `SQLiteDbRegion.ts` (extend for new territorial schema)

Add methods: `findParishHierarchy(parishId)`, `listCommunities(parishId)`, `findCommunityById(id)`

Old methods remain untouched (backward compatible).

**Acceptance criteria:**
- [x] `findParishHierarchy` returns a `ParishHierarchy` object with Maps pre-built
- [x] Integration test in `src/lib/server/adapters/__tests__/SQLiteDbRegion.test.ts`

### Task 4.2 — `SQLiteDbFacility.ts` (extend for new physical schema)

Add methods: `findChurchFacility(churchId)`, `listStationsByZone(zoneId)`, `listZonesByEvent(eventId)`

**Acceptance criteria:**
- [x] `findChurchFacility` returns `ChurchFacility` with Maps pre-built
- [x] Integration test passes

### Task 4.3 — `SQLiteDbMinistry.ts` (new file)

Methods: `listMinistries()`, `listRolesByMinistry(ministryId)`, `findRoleByCode(ministryCode, roleCode)`

**Acceptance criteria:**
- [x] Returns typed `Ministry[]` and `MinistryRole[]`
- [x] Integration test with seed data

### Task 4.4 — `SQLiteDbRoster.ts` (new file)

Methods: `createRoster(cmd)`, `loadRoster(eventId)`, `submitEntry(cmd)`, `confirmEntry(cmd)`, `reopenEntry(rosterId, communityId)`, `listByCommunity(communityId)`

Implement optimistic lock: `UPDATE roster SET version = version + 1 WHERE id = ? AND version = ?`

**Acceptance criteria:**
- [x] `submitEntry` is transactional (all-or-nothing)
- [x] Optimistic lock throws `ServiceError.conflict` on version mismatch
- [x] Integration tests for happy path + conflict path

### Task 4.5 — Update `SQLiteAdapter.ts` facade

Delegate new repository interfaces to new adapter modules.

**Acceptance criteria:**
- [x] `SQLiteAdapter` implements all four new repository interfaces
- [x] Old methods still pass existing tests

---

## Phase 5 — Service Layer

**Goal:** Business logic on top of the new repositories.

### Task 5.1 — `MinistryService.ts` (new)

Methods: `listMinistries()`, `resolveRoleByCode(ministryCode, roleCode)`

**Acceptance criteria:**
- [x] Pure service, no Drizzle imports
- [x] Unit tests (mock repository)

### Task 5.2 — `RosterService.ts` (new)

Methods:
- `applyTransition(entry, transition)` — pure function, no I/O
- `createRoster(cmd)` — orchestrates repository call
- `submitEntry(cmd)` — validates + transitions entry
- `confirmEntry(cmd)` — transitions + triggers station distribution
- `loadRoster(eventId)` — returns full `Roster` aggregate

**Acceptance criteria:**
- [x] `applyTransition` unit tests: all valid transitions pass; invalid ones throw `ServiceError.validation`
- [x] State guard tests: cannot `CONFIRM` a `draft` entry
- [x] Service integration test using in-memory SQLite

### Task 5.3 — Update `ChurchService.ts`

Add: `retrieveParishHierarchy()`, `retrieveChurchFacility(churchId)` using new repository interfaces.

**Acceptance criteria:**
- [x] Methods callable from new `load()` handlers
- [x] Old `ChurchService` methods remain for existing routes

---

**CHECKPOINT A:** All backend phases (0–5) complete. New schema + adapters + services are tested. No UI changes yet. Team reviews test coverage before proceeding to UI.

---

## Phase 6 — Feature-Flagged Settings Pages

**Goal:** New CRUD pages for the new domain model, shown only when `new_settings_pages` gate is on.

### Task 6.1 — Settings layout gate check

In `apps/src/routes/admin/settings/+layout.server.ts`:
- Check `new_settings_pages` gate
- Pass `isNewUX: boolean` to layout data

In `+layout.svelte`:
- Show new nav items (`Celebration`, `Section`, `Zone`, `Station`) when `isNewUX = true`
- Show old nav items (`Misa`, `Zona`, `Group Zona`, `Posisi`, `Zona Misa`) when `isNewUX = false`

**Acceptance criteria:**
- [x] No layout shift — both nav variants render correctly
- [x] Gate check does not add >50ms to layout load time

### Task 6.2 — Celebration settings page (replaces data-misa)

Route: `admin/settings/celebration/` (new; old `data-misa` remains)

- `+page.server.ts`: uses `EventService` + new `Mass`/`Celebration` entity
- Feature flag guard: redirect to `/admin/settings/data-misa` if gate is off

**Acceptance criteria:**
- [x] CRUD: create, list, edit, delete Celebration
- [x] Redirects correctly based on gate value

### Task 6.3 — Section + Zone settings pages (replaces data-zona + data-zona-group)

Routes: `admin/settings/section/`, `admin/settings/zone/`

- `section` page: CRUD using `SQLiteDbFacility.ts` via `ChurchService`
- `zone` page: CRUD, requires selecting a Section parent

**Acceptance criteria:**
- [x] Section list shows with Church context
- [x] Zone list filtered by Section

### Task 6.4 — Station settings page (replaces data-posisi)

Route: `admin/settings/station/`

- CRUD for `Station` with `ministryId` FK (dropdown from `MinistryService.listMinistries()`)
- Replaces boolean `isPpg` with `MinistryRole` dropdown

**Acceptance criteria:**
- [x] Ministry dropdown populated from `ministry` table (not hardcoded enum)
- [x] Old `data-posisi` route still works when gate is off

### Task 6.5 — Community (Lingkungan) settings page

Route: `admin/settings/lingkungan/`

**Context:** The `community` table was created in Phase 2 (starts empty — D3). This page provides the admin UI to populate it under the `new_settings_pages` gate. Community is the new-domain equivalent of old `lingkungan`; it requires a Wilayah parent.

**Dependency graph (all within this task):**

```
L1: ParishRepository — add createCommunity / updateCommunity / deactivateCommunity signatures
    └─ L2: SQLiteDbRegion — implement the three mutations + getParishIdByChurch helper
        └─ L3: SQLiteAdapter — delegate new methods
            └─ L5: +page.server.ts — load + 3 actions
                └─ L6: +page.svelte — table + modals
L4: +layout.svelte — add "Lingkungan" to NEW_MENU_ITEMS (independent)
```

**Design decisions:**

- Gate: `new_settings_pages` (same as section/zone/station). Redirect to `/admin/settings` on gate-off (no legacy direct equivalent).
- Load data: `listWilayahByChurch(churchId)` for the dropdown; `listCommunitiesForChurch(churchId)` for the table. Both are keyed by `churchId` from `session.user?.cid` — no raw `parishId` needed in the route.
- `parishId` for new rows: resolved from `church.parishId` via a `getParishIdByChurch(db, churchId)` helper in `SQLiteDbRegion.ts`.
- Table shows `wilayahName` (denormalized via JOIN — already in the `Community` entity).
- Soft-delete only (`active = 0`). No hard deletes.
- `CreateCommunityInput` type defined in `ParishRepository.ts` (keeps it co-located with the interface).

**Slice L1 — Repository interface**

File: `src/core/repositories/ParishRepository.ts`

Add:
```typescript
type CreateCommunityInput = {
  name: string;
  wilayahId: string;
  parishId: string;
  sequence: number | null;
  active: number;
};

createCommunity(input: CreateCommunityInput): Promise<Community>;
updateCommunity(id: string, patch: Partial<Pick<Community, 'name' | 'wilayahId' | 'sequence'>>): Promise<boolean>;
deactivateCommunity(id: string): Promise<boolean>;
```

**Acceptance criteria:**
- [ ] File compiles with no Drizzle imports
- [ ] `Community` return type matches `$core/entities/Parish.ts`

**Slice L2 — Adapter implementation**

File: `src/lib/server/adapters/SQLiteDbRegion.ts`

Add at end of file:
- `getParishIdByChurch(db, churchId)` — `SELECT parishId FROM church WHERE id = ?`; throws `ServiceError.notFound` if church has no parishId
- `createCommunity(db, input)` — `INSERT` with `uuidv4()` id; returns `Community` with wilayahName resolved via JOIN
- `updateCommunity(db, id, patch)` — `UPDATE ... RETURNING`; returns `boolean`
- `deactivateCommunity(db, id)` — `UPDATE SET active=0 RETURNING`; returns `boolean`

**Acceptance criteria:**
- [ ] `createCommunity` returns a `Community` with `wilayahName` populated (JOIN on wilayah)
- [ ] `deactivateCommunity` does not hard-delete

**Slice L3 — Adapter facade**

File: `src/lib/server/adapters/SQLiteAdapter.ts`

Import and delegate: `createCommunity`, `updateCommunity`, `deactivateCommunity`, `getParishIdByChurch`.

**Slice L4 — Nav item (independent)**

File: `src/routes/admin/settings/+layout.svelte`

Add `{ label: 'Lingkungan', href: '/admin/settings/lingkungan' }` to `NEW_MENU_ITEMS` (after Zona/Zone, before Pos/Station or at the end — territorial items together).

**Slice L5 — Server load + actions**

File: `src/routes/admin/settings/lingkungan/+page.server.ts`

```
load():
  checkServerGate('new_settings_pages') → redirect /admin/settings if false
  handlePageLoad → redirect /signin if no session
  hasRole('admin') → redirect / if false
  session.user?.cid → error 500 if missing
  [wilayahs, communities] = await Promise.all([
    repo.listWilayahByChurch(churchId),
    repo.listCommunitiesForChurch(churchId)
  ])
  analytics (statsig + posthog)
  return { wilayahs, communities, churchId }

actions: create / update / delete
  create: name (required), wilayahId (required), sequence (optional)
    → repo.getParishIdByChurch(churchId) to resolve parishId
    → repo.createCommunity(...)
  update: communityId (required), name, wilayahId, sequence
    → repo.updateCommunity(...)
  delete: communityId (required)
    → repo.deactivateCommunity(...)
```

**Acceptance criteria:**
- [ ] Gate-off → redirect `/admin/settings`
- [ ] Gate-on, no session → redirect `/signin`
- [ ] Gate-on, non-admin → redirect `/`
- [ ] Load returns both `wilayahs` and `communities`
- [ ] `create` fails with 400 if `name` or `wilayahId` missing
- [ ] `delete` is soft-delete only
- [ ] Analytics fired on load + each mutation

**Slice L6 — Svelte page**

File: `src/routes/admin/settings/lingkungan/+page.svelte`

UI spec:
- Breadcrumb: Beranda → Admin → Pengaturan → Lingkungan
- Heading: "Pengaturan Lingkungan" + "Tambah" button (top-right)
- Empty state: descriptive text when `communities.length === 0`
- Table columns: Wilayah | Nama | Urutan | Aksi (⋮ dropdown: Edit / Hapus)
- Create/Edit modal: Nama (required text), Wilayah (required select from `wilayahs`), Urutan (optional number)
- Delete confirmation modal: shows community name, warns wilayah membership

**Acceptance criteria:**
- [ ] Wilayah dropdown populated from `data.wilayahs`
- [ ] Table rows show `wilayahName` (not `wilayahId`)
- [ ] `isSubmitting` disables form controls during submit
- [ ] Success clears modal; error shows `<Alert color="red">`
- [ ] `use:enhance` with `await invalidateAll()` on all forms

**CHECKPOINT 6.x:** `npm run check` passes. Gate-on shows page with communities table and wilayah dropdown. Gate-off redirects cleanly to `/admin/settings`. No regressions on section/zone/station.

---

### Task 6.6 — Parish & Wilayah settings page

Route: `admin/settings/parish/`

**Context:** The `parish` table has exactly one row (D1: single-parish decision, seeded at migration time). This page exposes two concerns:
1. **Parish info** — view and edit the single parish record (`name`, `code`). Create and delete are intentionally out of scope.
2. **Wilayah CRUD** — full create / read / update / soft-delete for wilayahs belonging to the parish. This is the primary management surface of the page; there is currently no dedicated Wilayah management page in the new UX.

**Gate:** `new_settings_pages`. Gate-off redirect: `/admin/settings` (no legacy equivalent).

**`parishId` resolution:** `session.user?.cid` → `getParishIdByChurch(churchId)` — same pattern as `lingkungan/`.

**Dependency graph (all within this task):**

```
P1: ParishRepository — add findParishById, updateParish, CreateWilayahInput, createWilayah, updateWilayah, deactivateWilayah signatures
    └─ P2: SQLiteDbRegion — implement the five new methods
        └─ P3: SQLiteAdapter — delegate five new methods
            └─ P5: +page.server.ts — load + 4 actions (updateParish, createWilayah, updateWilayah, deleteWilayah)
                └─ P6: +page.svelte — parish edit card + wilayah table + modals
P4: +layout.svelte — add "Paroki" to NEW_MENU_ITEMS (independent)
```

**Slice P1 — Repository interface**

File: `src/core/repositories/ParishRepository.ts`

Add:
```typescript
type CreateWilayahInput = {
  name: string;
  code: string | null;
  sequence: number | null;
  parishId: string;
  active: number;
};

findParishById(id: string): Promise<Parish | null>;
updateParish(id: string, patch: Partial<Pick<Parish, 'name' | 'code'>>): Promise<boolean>;
createWilayah(input: CreateWilayahInput): Promise<Wilayah>;
updateWilayah(id: string, patch: Partial<Pick<Wilayah, 'name' | 'code' | 'sequence'>>): Promise<boolean>;
deactivateWilayah(id: string): Promise<boolean>;
```

**Acceptance criteria:**
- [ ] File compiles with no Drizzle imports
- [ ] `Parish` and `Wilayah` return types match `$core/entities/Parish.ts`

**Slice P2 — Adapter implementation**

File: `src/lib/server/adapters/SQLiteDbRegion.ts`

Add at end of file:
- `findParishById(db, id)` — `SELECT` from `parish` WHERE `id = ?`; returns `Parish | null`
- `updateParish(db, id, patch)` — `UPDATE parish SET ... RETURNING`; returns `boolean`
- `createWilayah(db, input)` — `INSERT` with `uuidv4()` id; returns `Wilayah`
- `updateWilayah(db, id, patch)` — `UPDATE wilayah SET ... RETURNING`; returns `boolean`
- `deactivateWilayah(db, id)` — `UPDATE SET active=0 RETURNING`; returns `boolean`

**Acceptance criteria:**
- [ ] `findParishById` returns `null` (not throws) when id is not found
- [ ] `deactivateWilayah` does not hard-delete

**Slice P3 — Adapter facade**

File: `src/lib/server/adapters/SQLiteAdapter.ts`

Import and delegate: `findParishById`, `updateParish`, `createWilayah`, `updateWilayah`, `deactivateWilayah`.

**Slice P4 — Nav item (independent)**

File: `src/routes/admin/settings/+layout.svelte`

Add `{ label: 'Paroki', href: '/admin/settings/parish' }` as the first item in `NEW_MENU_ITEMS` (parish is the root territorial entity).

**Slice P5 — Server load + actions**

File: `src/routes/admin/settings/parish/+page.server.ts`

```
load():
  checkServerGate('new_settings_pages') → redirect /admin/settings if false
  handlePageLoad → redirect /signin if no session
  hasRole('admin') → redirect / if false
  session.user?.cid → error 500 if missing
  parishId = await repo.getParishIdByChurch(churchId)
  [parish, wilayahs] = await Promise.all([
    repo.findParishById(parishId),
    repo.listWilayahsByParish(parishId)
  ])
  analytics (statsig + posthog)
  return { parish, wilayahs, parishId }

actions: updateParish / createWilayah / updateWilayah / deleteWilayah
  updateParish: name (required), code (required)
    → repo.updateParish(parishId, { name, code })
  createWilayah: name (required), code (optional), sequence (optional)
    → repo.createWilayah({ name, code, sequence, parishId, active: 1 })
  updateWilayah: wilayahId (required), name (required), code (optional), sequence (optional)
    → repo.updateWilayah(wilayahId, { name, code, sequence })
  deleteWilayah: wilayahId (required)
    → repo.deactivateWilayah(wilayahId)
```

**Acceptance criteria:**
- [ ] Gate-off → redirect `/admin/settings`
- [ ] Gate-on, no session → redirect `/signin`
- [ ] Gate-on, non-admin → redirect `/`
- [ ] Load returns both `parish` and `wilayahs`
- [ ] `updateParish` fails with 400 if `name` or `code` missing
- [ ] `createWilayah` fails with 400 if `name` missing
- [ ] `deleteWilayah` is soft-delete only
- [ ] Analytics fired on load + each mutation

**Slice P6 — Svelte page**

File: `src/routes/admin/settings/parish/+page.svelte`

UI spec:
- Breadcrumb: Beranda → Admin → Pengaturan → Paroki
- Section 1: "Informasi Paroki" card — Nama (required text) + Kode (required text) + Simpan button
- Section 2: "Wilayah" heading + "Tambah Wilayah" button (top-right)
- Empty state: descriptive text when `wilayahs.length === 0`
- Table columns: Nama | Kode | Urutan | Aksi (⋮ dropdown: Edit / Hapus)
- Create/Edit modal: Nama (required text), Kode (optional text), Urutan (optional number)
- Delete confirmation modal: shows wilayah name, warns that communities in this wilayah may be affected

**Acceptance criteria:**
- [ ] Parish info form pre-populated from `data.parish`
- [ ] Wilayah table rows show `code` (or "—" when null) and `sequence`
- [ ] `isSubmitting` disables all form controls during submit
- [ ] Success clears modal and refreshes data; error shows `<Alert color="red">`
- [ ] `use:enhance` with `await invalidateAll()` on all forms

**CHECKPOINT 6.6:** `npm run check` passes. Gate-on shows parish edit card + wilayah table. Creating/editing/deleting a wilayah persists correctly. Gate-off redirects to `/admin/settings`. No regressions on `lingkungan/`, `section/`, `zone/`, `station/`.

---

## Phase 7 — Feature-Flagged Core Pages

**Goal:** New roster flow for the `tatib` and `zone` admin pages.

### Task 7.0 — Roster creation page

Route: `admin/roster/` — gate `new_roster_flow`

- `load()`: gates on `new_roster_flow` → redirect `/admin` if off
- Two modes (tabs): manual (event picker + community checklist) and XLSX bulk upload
- Community table is authoritative — no lingkungan fallback (guaranteed by parent gate `new_domain_model`)
- `uploadRoster` action: also gates on `new_roster_flow`; resolves community names from community table only

**Acceptance criteria:**
- [x] Page redirects to `/admin` when `new_roster_flow` is off
- [x] Manual creation: duplicate roster for same event returns 409
- [x] XLSX upload: skips existing rosters (idempotent), reports created/skipped counts
- [x] No lingkungan fallback in either load or uploadRoster

---

### Task 7.1 — New tatib (roster) admin page

Route: `admin/tatib/[id]/` — gate `new_roster_flow`

- `load()`: calls `RosterService.loadRoster(eventId)`
- Shows `RosterEntry` list with status badges (draft/submitted/confirmed)
- Action: `confirmEntry` calls `RosterService.confirmEntry`

**Acceptance criteria:**
- [x] Roster loads with all entries and usher names
- [x] Confirm action transitions entry from `submitted → confirmed`
- [x] Optimistic lock error shows user-friendly message (not a 500)

### Task 7.2 — New community usher submission page

Route: `f/tatib/` — gate `new_roster_flow`

> **D4 implication:** This is a **public form** — no `locals.user` guard in `+page.server.ts`. Community identifies the target `RosterEntry` via a short token or `rosterId + communityId` in the URL query string. No session required. The token must be validated against the DB (not trusted blindly).

- Form: submit usher names with `MinistryRole` selection (loaded from `MinistryService`)
- Action: `RosterService.submitEntry(cmd)` — validates token, then transitions entry `draft → submitted`

**Acceptance criteria:**
- [x] Page loads without a logged-in session
- [x] Invalid or expired token returns a 404, not a 500
- [x] Community can submit ushers only for `draft` entries (submitted/confirmed entries show read-only view)
- [x] Duplicate submission shows validation error (not a 500)

### Task 7.3 — Zone assignment page update

Route: `admin/zone/` — gate `new_domain_model`

- Loads `ChurchFacility` (Church → Section → Zone → Station hierarchy)
- Replaces flat `church_zone` + `church_zone_group` queries

**Acceptance criteria:**
- [x] Section/Zone/Station hierarchy renders without N+1 queries
- [x] Performance: page load < 200ms on dev DB

---

**CHECKPOINT B:** Full new UX is live behind gates. QA smoke test on new routes. Opt-in percentage raised to 50% in Statsig.

---

## Phase 8 — Sunset Old Code

> **Do not start Phase 8 until Statsig shows ≥14 days of stable usage with new_roster_flow at 100%.**

### Task 8.1 — Remove old entity interfaces

- Remove `ChurchZoneGroup`, `ChurchPosition` from `Schedule.ts` (or deprecate with JSDoc `@deprecated`)
- Remove boolean flags from `EventUsher`

**Acceptance criteria:**
- [ ] `npm run check` passes with no type errors
- [ ] All old routes removed or redirected

### Task 8.2 — Data migration: lingkungan → community (D3)

Before dropping old tables, copy existing `lingkungan` rows into `community`:

```sql
INSERT INTO community (id, name, wilayah_id, parish_id, sequence, active, created_at)
SELECT id, name, wilayah_id, (SELECT id FROM parish LIMIT 1), sequence, active, created_at
FROM lingkungan;
```

Run and verify row counts match before proceeding to drops.

**Acceptance criteria:**
- [ ] `SELECT COUNT(*) FROM community` = `SELECT COUNT(*) FROM lingkungan` after script
- [ ] Script is idempotent (safe to re-run)

### Task 8.3 — Drop old schema tables (migration)

- Drop: `church_zone_group`, `church_position`, `church_zone` (replaced by `section`, `zone`, `station`)
- Drop: `event_usher` (replaced by `roster_usher`)
- Drop: `lingkungan` (data already migrated to `community` in Task 8.2)

**Acceptance criteria:**
- [ ] Migration is reversible (snapshot backup before drop)
- [ ] Staging DB migration tested before production

### Task 8.3 — Remove feature flag branches

- Remove `isNewUX` checks from layouts and `load()` handlers
- Archive Statsig gates

---

**CHECKPOINT C:** Old code fully removed. Clean codebase with single architecture. Post-migration review.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Schema migration corrupts live data | Low | High | Always test on copy of production DB; add explicit `BEGIN/ROLLBACK` in migration scripts |
| Statsig gate check adds latency to SSR | Medium | Low | Cache gate result per request in `locals`; benchmark before Phase 6 |
| Old + new code diverge during development | High | Medium | Keep old code read-only after Phase 5; no new features on old paths |
| Optimistic lock conflicts confuse users | Low | Medium | Friendly error message + retry button; log conflicts to PostHog |
| Community misidentified during roster | Low | High | `communityName` snapshot on `RosterEntry`; explicit FK + name snapshot |

---

## Decisions (recorded 2026-05-14)

| # | Question | Decision | Implication |
|---|---|---|---|
| D1 | Single parish or multi-tenant? | **Single parish** | No `parishId` tenant scoping needed. `parish` table has exactly one row (seed on init). All FKs to `parish` are effectively constants; queries do not need a tenant filter. |
| D2 | Who sees the opt-in toggle? | **Admin role only** | Gate check in layout uses `locals.user.role === 'admin'`; non-admin users are never shown the toggle and always get the old UX. |
| D3 | Migrate `lingkungan` → `community` data? | **Phase 8 (deferred)** | Phase 2 creates the `community` table empty. New data entry uses the new pages. Old `lingkungan` rows are migrated by a script in Phase 8, after sunset of old code. |
| D4 | Is `f/tatib` authenticated? | **Public form** | No `locals.user` check in `f/tatib/+page.server.ts`. Community identifies itself via a token or roster entry ID in the URL. No session required. |
