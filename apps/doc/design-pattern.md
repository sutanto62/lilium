# Design Patterns for the Three Domain Relationships

> **Scope:** This document describes the **implementation patterns** (chosen patterns, rejected alternatives, TypeScript interfaces, DB schema, files to create) for the new domain model.
> For canonical concept definitions, naming policy, and the entity taxonomy, see [`ontology.md`](ontology.md).
> For the migration plan and phase-by-phase status, see [`migrate.md`](migrate.md).
> The new model is currently live only in `admin/settings/*` routes. Legacy routes still use the old model; see the "Legacy Domain Model Reference" section at the bottom of this document.

## Context

This document captures the chosen design patterns for three key domain relationships in the church ministry scheduling system. Following the five orthogonal axes defined in `migrate.md`, these three relationships are where the most important architectural decisions live:

1. **Two distinct WHERE hierarchies** — territorial (Parish → Wilayah → Community) and physical (Church → Section → Zone → Station)
2. **Ministry → MinistryRole** — the ministry catalog
3. **Roster** — PETA assigns Community to Celebration; Community submits ushers; PETA confirms

For each relationship, this document names the chosen pattern, explains why alternatives were rejected, and shows the TypeScript interface shape and the files to create.

---

## Pattern 1: Two Distinct WHERE Hierarchies

### Chosen Pattern: Fixed-Depth Hierarchy with Named Layers (two separate trees)

The WHERE axis in `migrate.md §2` has **two orthogonal branches**. Conflating them into one tree (e.g. Parish → Church → Wilayah → Community) produces incorrect queries — a Community belongs to a Wilayah, not to a Church building.

```
WHERE (territorial)        WHERE (physical)
───────────────────        ─────────────────────────
Parish                     Parish
 └─ Wilayah                 └─ Church  (building)
     └─ Community               └─ Section  (was ZoneGroup)
         └─ Parishioner             └─ Zone
                                        └─ Station  (was ChurchPosition)
```

A **Parish** is the administrative root of both trees — it owns Wilayahs *and* it owns Churches. But the two branches are independently navigable. Roster authorship follows the territorial branch (PETA assigns a Community to a Celebration). Position distribution follows the physical branch (a Ministry fills Stations in a Zone).

GoF **Composite** is rejected for the same reason as always: fixed depth, named layers, level-specific query patterns. A generic `TreeNode` would erase the Wilayah/Section distinction and complicate SQL joins.

---

### Sub-hierarchy A: Territorial (Parish → Wilayah → Community)

Wilayah is kept as an Indonesian proper noun — no English equivalent captures the canonical Catholic territorial unit. Community replaces *Lingkungan* in code (English for downstream contributors), but UI labels remain *Lingkungan*.

#### Interfaces

```typescript
// src/core/entities/Parish.ts

/** Administrative root. One Parish owns one or more Wilayahs and one or more Churches. */
export interface Parish {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly active: number;
}

export interface Wilayah {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly sequence: number | null;
  readonly parishId: string;     // FK to Parish
  readonly active: number;
}

export interface Community {
  readonly id: string;
  readonly name: string;
  readonly wilayahId: string;    // FK to Wilayah
  readonly wilayahName: string;  // denormalized via JOIN — avoids repeated lookups
  readonly sequence: number | null;
  readonly parishId: string;     // FK to Parish (for direct parish-scoped queries)
  readonly active: number;
}

/** Full ancestry of a Community — used in RosterEntry snapshots */
export interface CommunityWithAncestry {
  readonly community: Community;
  readonly wilayah: Wilayah;
  readonly parish: Parish;
}
```

#### Database Schema

```sql
parish   (id, name, code, active)
wilayah  (id, name, code, sequence, parish_id → parish, active)
community (id, name, code, sequence, wilayah_id → wilayah, parish_id → parish, active)
```

---

### Sub-hierarchy B: Physical (Church → Section → Zone → Station)

Church is a physical building belonging to a Parish. Below it, three spatial levels organise ministry assignment: Section (a named part of the building), Zone (a service area within a Section), Station (a specific assignment point within a Zone).

#### Interfaces

```typescript
// src/core/entities/Facility.ts

export interface Church {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly parishId: string;              // FK to Parish
  readonly requiresSpecialCollection: number; // drives PPG/PPKG collection logic
  readonly active: number;
}

/**
 * A named part of the church building.
 * Was: ChurchZoneGroup. Examples: "Main Nave", "Basement", "Overflow Tent".
 * Sections group Zones for display and capacity planning.
 */
export interface Section {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly sequence: number | null;
  readonly churchId: string;             // FK to Church
  readonly active: number;
}

/**
 * A service area within a Section, assignable to a ministry team.
 * Was: ChurchZone. Examples: "Left Aisle", "Main Entrance", "Altar Area".
 */
export interface Zone {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly sequence: number | null;
  readonly churchId: string;             // FK to Church
  readonly sectionId: string | null;     // FK to Section (optional grouping)
  readonly active: number;
}

/**
 * A specific assignment point within a Zone.
 * Was: ChurchPosition. Examples: "Door 1", "Side Aisle 3", "Altar Left".
 * Canonical English usher term: Station. Indonesian: Pos.
 */
export interface Station {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly sequence: number | null;
  readonly churchId: string;             // FK to Church
  readonly zoneId: string;              // FK to Zone
  readonly ministryId: string;          // FK to Ministry (which ministry serves here)
  readonly defaultRoleId: string | null; // FK to MinistryRole (null = any role valid)
  readonly active: number;
}
```

#### Database Schema

```sql
church  (id, name, code, parish_id → parish, requires_special_collection, active)
section (id, name, code, description, sequence, church_id → church, active)
zone    (id, name, code, description, sequence, church_id → church,
         section_id → section, active)
station (id, name, code, description, sequence, church_id → church,
         zone_id → zone, ministry_id → ministry, default_role_id → ministry_role, active)
```

---

### Shared Value Objects

```typescript
// src/core/entities/Parish.ts  (continued)

/** Scoping context passed to services instead of bare string IDs */
export interface ChurchContext {
  readonly parishId: string;
  readonly churchId: string;
  readonly churchCode: string;
}

/**
 * The full territorial + physical hierarchy for a Parish, pre-loaded and indexed.
 * Built once per request; avoids N+1 queries in roster and schedule pages.
 */
export interface ParishHierarchy {
  readonly parish: Parish;
  // --- Territorial branch ---
  readonly wilayahs: ReadonlyArray<Wilayah>;
  readonly communitiesByWilayah: ReadonlyMap<string, ReadonlyArray<Community>>;
  // --- Physical branch ---
  readonly churches: ReadonlyArray<Church>;
}

/**
 * The physical hierarchy below one Church, pre-loaded and indexed.
 * Used by schedule and position-distribution services.
 */
export interface ChurchFacility {
  readonly church: Church;
  readonly sections: ReadonlyArray<Section>;
  readonly zonesBySection: ReadonlyMap<string, ReadonlyArray<Zone>>;
  readonly stationsByZone: ReadonlyMap<string, ReadonlyArray<Station>>;
}
```

---

### Files to Create

| File | Purpose |
|---|---|
| `src/core/entities/Parish.ts` | `Parish`, `Wilayah`, `Community`, `CommunityWithAncestry`, `ChurchContext`, `ParishHierarchy`, `ChurchFacility` |
| `src/core/entities/Facility.ts` | `Church`, `Section`, `Zone`, `Station` |
| `src/core/repositories/ParishRepository.ts` | `findParishHierarchy(parishId)`, `listCommunities`, `findCommunityById` |
| `src/core/repositories/FacilityRepository.ts` | `findChurchFacility(churchId)`, `listStationsByZone`, `listZonesByMass` |
| `src/core/service/ChurchService.ts` | `retrieveParishHierarchy()`, `retrieveChurchFacility()` |
| `src/lib/server/adapters/SQLiteDbRegion.ts` | `findParishHierarchy` — parish + wilayah + community queries, assembles Maps |
| `src/lib/server/adapters/SQLiteDbFacility.ts` | `findChurchFacility` — church + section + zone + station queries |
| `src/lib/server/db/schema.ts` | `parish`, `wilayah`, `community`, `church`, `section`, `zone`, `station` table definitions |

---

## Pattern 2: Ministry → MinistryRole

### Chosen Pattern: Type Object (Catalog-Driven)

A hard-coded enum for ministry types (`'usher' | 'prodiakon' | 'peta'`) violates the **Open/Closed Principle** — adding EMHC, AltarServer, or Lektor would require a schema migration, a TypeScript type change, and new conditional branches in the queue/distribution logic.

**Type Object** (Woolf & Johnson 1997) separates the catalog of types from the instances. A `Ministry` row is the "type object" — it describes a category of service. New ministries are added by inserting rows, not by changing code.

`MinistryRole` is the sub-catalog within a ministry. Rather than boolean flags (`isPpg`, `isKolekte`), each role is a named catalog entry: `REGULAR`, `KOLEKTE`, `PPG`, `PPKG`. The distribution logic reads `MinistryRole.code` — no branching on booleans.

### Interfaces

```typescript
// src/core/entities/Ministry.ts

/**
 * Type Object: the catalog entry for a ministry category.
 * New ministry types are inserted as rows, not as enum values.
 */
export interface Ministry {
  readonly id: string;
  readonly name: string;              // "Penerima Tamu", "Prodiakon", "PETA"
  readonly code: string;              // "USHER", "PRODIAKON", "PETA", "EMHC"
  readonly description: string | null;
  readonly requiresStation: boolean;  // false for PETA (roster author, not station-bound)
  readonly active: number;
}

/**
 * Sub-catalog: a role within a ministry.
 * Replaces boolean isPpg / isKolekte flags.
 */
export interface MinistryRole {
  readonly id: string;
  readonly ministryId: string;
  readonly name: string;              // "Regular", "Kolekte", "PPG", "PPKG"
  readonly code: string;              // "REGULAR", "KOLEKTE", "PPG", "PPKG"
  readonly isSpecialCollection: boolean; // true for Kolekte, PPG, PPKG
  readonly active: number;
}
```

### Seed Data (applied at schema initialization)

```
Ministry rows:      USHER, PRODIAKON, PETA, EMHC, ALTAR_SERVER
MinistryRole rows:  REGULAR (USHER), KOLEKTE (USHER), PPG (USHER), PPKG (USHER), PROCESSIONAL (USHER)
```

Adding a new ministry type: `INSERT INTO ministry (id, name, code, ...) VALUES (...)`. Zero code changes.

### Database Schema

```sql
ministry       (id, name, code, description, requires_station, active)
ministry_role  (id, ministry_id → ministry, name, code, is_special_collection, active)
-- station references ministry (see Pattern 1B above)
-- roster_usher references ministry_role (see Pattern 3 below)
```

### Files to Create

| File | Purpose |
|---|---|
| `src/core/entities/Ministry.ts` | `Ministry`, `MinistryRole` |
| `src/core/repositories/MinistryRepository.ts` | `listMinistries`, `listRolesByMinistry`, `findRoleByCode` |
| `src/core/service/MinistryService.ts` | Thin service over catalog; used by RosterService for role resolution |
| `src/lib/server/adapters/SQLiteDbMinistry.ts` | Drizzle queries against `ministry` + `ministry_role` tables |
| `src/lib/server/db/schema.ts` | `ministry`, `ministry_role` table definitions |

---

## Pattern 3: Roster

### Chosen Pattern: Aggregate Root (DDD) + State Machine (Discriminated Union)

The Roster is the central scheduling artefact. It needs a first-class object that:
- Owns the Community → Celebration assignment (PETA authors this)
- Tracks lifecycle: `draft → submitted → confirmed`
- Records who authored it (the PETA member)
- Supports versioning (PETA can revise before confirmation; optimistic locking prevents concurrent edit corruption)

**Aggregate Root** (Evans DDD Ch. 6): `Roster` is the root. `RosterEntry` (one Community serving one Celebration) is the child entity inside the aggregate boundary. `RosterUsher` (one parishioner name + role) is a value inside each entry.

The `wilayah` and `community` names are stored as **snapshots** on the `RosterEntry` at assignment time — this preserves the community name even if the Community is later renamed or deactivated. This is intentional denormalization.

**State Machine** as a TypeScript discriminated union (not GoF State classes): the transition function is pure business logic with no I/O, lives in `core/service/`, and is trivially unit-testable without any database setup.

### Interfaces

```typescript
// src/core/entities/Roster.ts

export type RosterStatus = 'draft' | 'submitted' | 'confirmed';

/** Aggregate Root */
export interface Roster {
  readonly id: string;
  readonly eventId: string;           // FK to event (the Celebration)
  readonly createdByUserId: string;   // PETA member who authored this roster
  readonly version: number;           // optimistic lock — increment on each PETA edit
  readonly status: RosterStatus;      // overall status = min(entry statuses)
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly entries: ReadonlyArray<RosterEntry>;
}

/** Child entity: one Community's assignment to one Celebration */
export interface RosterEntry {
  readonly id: string;
  readonly rosterId: string;
  readonly communityId: string;
  /** Snapshot at assignment time */
  readonly communityName: string;
  readonly wilayahId: string;
  readonly wilayahName: string;
  readonly status: RosterStatus;
  readonly submittedAt: number | null;
  readonly confirmedAt: number | null;
  readonly ushers: ReadonlyArray<RosterUsher>;
}

/** Value: one parishioner in a RosterEntry */
export interface RosterUsher {
  readonly id: string;
  readonly name: string;              // name string; future: Parishioner FK
  readonly ministryRoleId: string;    // FK to MinistryRole — REGULAR, KOLEKTE, PPG, PPKG
  readonly stationId: string | null;  // FK to Station (position assignment)
  readonly sequence: number | null;
}

/** Commands accepted by RosterService */
export interface CreateRosterCommand {
  eventId: string;
  createdByUserId: string;
  communityIds: string[];            // PETA picks which communities serve this Celebration
}

export interface SubmitRosterEntryCommand {
  rosterId: string;
  communityId: string;
  ushers: Array<{ name: string; ministryRoleCode: string }>;
}

export interface ConfirmRosterEntryCommand {
  rosterId: string;
  communityId: string;
  confirmedByUserId: string;
}
```

### State Machine (pure function, no I/O)

```typescript
// src/core/service/RosterService.ts

type RosterTransition =
  | { type: 'SUBMIT'; ushers: RosterUsher[] }
  | { type: 'CONFIRM'; confirmedByUserId: string }
  | { type: 'REOPEN' };

function applyTransition(entry: RosterEntry, t: RosterTransition): RosterEntry {
  switch (t.type) {
    case 'SUBMIT':
      if (entry.status !== 'draft')
        throw ServiceError.validation('Entry is not in draft status');
      return { ...entry, status: 'submitted', submittedAt: Date.now(), ushers: t.ushers };
    case 'CONFIRM':
      if (entry.status !== 'submitted')
        throw ServiceError.validation('Entry is not submitted');
      return { ...entry, status: 'confirmed', confirmedAt: Date.now() };
    case 'REOPEN':
      return { ...entry, status: 'draft', submittedAt: null, confirmedAt: null };
  }
}
```

### PETA / Community Role Boundary

```
PETA creates Roster → RosterEntry stubs created for each Community (status: draft)
     ↓
Community submits usher names via submitEntry → status: submitted
     ↓
PETA confirms + runs station distribution via confirmEntry → status: confirmed
```

Route → service mapping:

| Route | Action | Service call |
|---|---|---|
| `routes/admin/tatib/[id]` | Load schedule | `RosterService.loadRoster(eventId)` |
| `routes/admin/tatib/[id]` | Confirm entry | `RosterService.confirmEntry(cmd)` |
| `routes/f/tatib` | Submit ushers | `RosterService.submitEntry(cmd)` |
| `routes/community` | View assignments | `RosterService.listByCommunity(communityId)` |

### Database Schema

```sql
roster (
  id, event_id → event, created_by_user_id → user,
  version, status, created_at, updated_at
)

roster_entry (
  id, roster_id → roster,
  community_id → community,
  community_name,   -- snapshot
  wilayah_id → wilayah,
  wilayah_name,     -- snapshot
  status, submitted_at, confirmed_at
)

roster_usher (
  id, roster_entry_id → roster_entry,
  name,                          -- plain string; future: parishioner_id FK
  ministry_role_id → ministry_role,
  station_id → station,          -- FK to Station (was church_position)
  sequence, created_at
)
```

### Files to Create

| File | Purpose |
|---|---|
| `src/core/entities/Roster.ts` | `Roster`, `RosterEntry`, `RosterUsher`, command types, `RosterStatus` |
| `src/core/repositories/RosterRepository.ts` | `createRoster`, `loadRoster`, `submitEntry`, `confirmEntry`, `reopenEntry`, `listByCommunity` |
| `src/core/service/RosterService.ts` | `applyTransition` pure function + service methods orchestrating repository calls |
| `src/lib/server/adapters/SQLiteDbRoster.ts` | Drizzle queries; transactional submit; optimistic-lock update |
| `src/lib/server/db/schema.ts` | `roster`, `roster_entry`, `roster_usher` table definitions |
| `src/routes/admin/tatib/[id]/+page.server.ts` | Load + confirm actions via `RosterService` |
| `src/routes/f/tatib/+page.server.ts` | Submit action via `RosterService.submitEntry` |

---

## How the Three Patterns Compose (Clean Architecture)

```
core/entities/
  Parish.ts      ← Pattern 1A: Parish, Wilayah, Community, ParishHierarchy, ChurchFacility
  Facility.ts    ← Pattern 1B: Church, Section, Zone, Station
  Ministry.ts    ← Pattern 2: Type Object catalog (Ministry, MinistryRole)
  Roster.ts      ← Pattern 3: Aggregate Root + State Machine

core/repositories/
  ParishRepository    ← territorial hierarchy (Parish → Wilayah → Community)
  FacilityRepository  ← physical hierarchy (Church → Section → Zone → Station)
  MinistryRepository  ← ministry + role catalog
  RosterRepository    ← roster lifecycle operations
  EventRepository     ← celebration CRUD + queries

core/service/
  ChurchService       ← retrieveParishHierarchy(), retrieveChurchFacility()
  MinistryService     ← catalog reads; role resolution by code
  RosterService       ← applyTransition() + orchestration

lib/server/adapters/
  SQLiteDbRegion.ts   ← Parish + Wilayah + Community queries
  SQLiteDbFacility.ts ← Church + Section + Zone + Station queries
  SQLiteDbMinistry.ts ← Ministry + MinistryRole catalog reads
  SQLiteDbRoster.ts   ← transactional roster writes
  SQLiteDbEvent.ts    ← celebration queries
  SQLiteAdapter.ts    ← facade; delegates to all modules above
```

**Dependency rule:**
- Roster knows Community (from territorial hierarchy) and MinistryRole (from Ministry).
- Station knows Ministry (from Ministry), but Ministry does not know about Station.
- Territorial and physical hierarchies are orthogonal — neither knows about the other.
- All three axes are composed only at the service level (RosterService, ChurchService).

---

## Build Order

| Phase | Deliverable | Schema? |
|---|---|---|
| 1 | `Parish.ts` + `Facility.ts` + `ParishRepository` + `FacilityRepository` + all four hierarchy tables | Yes |
| 2 | `Ministry.ts` + `ministry` + `ministry_role` tables + seed data | Yes |
| 3 | `Roster.ts` shell + `roster` + `roster_entry` + `roster_usher` tables | Yes |
| 4 | `RosterService.createRoster()` + `submitEntry()` + `applyTransition()` unit tests | No |
| 5 | `RosterService.confirmEntry()` + station distribution inline | No |
| 6 | Route wiring: admin tatib + f/tatib form actions | No |

Each phase is independently shippable. Unit tests for `applyTransition` require no database.

---

## Why GoF Patterns Are Not the Default Here

The Gang of Four book (Design Patterns, 1994) was written for **Java/C++ circa 1994** — languages with no first-class functions, no closures, no generics, and rigid class-based OOP. Most patterns exist to work around those language limitations, not to express domain ideas.

Peter Norvig found that **16 of 23 GoF patterns are simplified or eliminated** by languages with first-class functions. TypeScript is one of them.

### Pattern-by-Pattern Disposition

| Pattern | Why it's not used here |
|---|---|
| **Singleton** | ES modules are singletons by default. |
| **Factory / Abstract Factory** | TypeScript generics + DI handle this without boilerplate class hierarchies. |
| **Builder** | Typed object literals + spread operator are cleaner for construction. |
| **Observer** | Built into Svelte stores, DOM events, and SvelteKit form actions. |
| **Iterator** | Native language feature (`for...of`, generators). |
| **Strategy** | First-class functions. Pass a function, not a class hierarchy. |
| **Template Method** | Replaced by function composition and higher-order functions. |
| **Decorator** | TypeScript decorator syntax or plain function wrapping. |
| **Command** | Closures already encapsulate action + context (see `RosterTransition` discriminated union above). |
| **Prototype** | `{ ...obj }` spread is built into JS. |
| **Composite** | Rejected explicitly for both WHERE hierarchies — fixed depth and named layers are clearer than a generic `TreeNode`, and SQL LEFT JOINs are optimal on typed tables. |
| **State (GoF class-based)** | Replaced by TypeScript discriminated unions + a pure `applyTransition` function (see Pattern 3). No I/O, fully unit-testable. |

### Patterns That Remain Genuinely Useful

Some GoF patterns are language-agnostic and stay relevant regardless of stack:

- **Facade** — `SQLiteAdapter` is a facade that delegates to domain-specific modules (`SQLiteDbRegion`, `SQLiteDbFacility`, etc.)
- **Adapter** — the entire `lib/server/adapters/` layer is an Adapter: it translates Drizzle/SQLite results into domain entities
- **Type Object** *(Woolf & Johnson 1997, not GoF)* — used explicitly in Pattern 2: `Ministry` rows are the extension point, not enum values

### The Principle

> *"When I see patterns in my programs, I consider it a sign of trouble."* — Paul Graham

Patterns are a last resort, not a starting point. A function, a discriminated union, or a plain TypeScript interface almost always suffices. Apply a GoF pattern only when the problem it solves is genuinely present — not because the domain noun resembles a pattern name.

---

## Design Decisions

- **Two separate WHERE hierarchies, not one chain** — territorial (Parish → Wilayah → Community) and physical (Church → Section → Zone → Station) are orthogonal; combining them into one tree produces wrong queries
- **Wilayah stays as an Indonesian proper noun** — no English equivalent captures the canonical Catholic territorial unit; UI label remains *Wilayah*, TypeScript type is `Wilayah`
- **No Composite pattern** — fixed depth at each level, named types are clearer and SQL LEFT JOINs are optimal
- **No enum for ministry type** — catalog rows are the extension point; adding a ministry is an INSERT, not a code change
- **No boolean flags for roles** — `isPpg` / `isKolekte` are an implicit enum; `MinistryRole` makes it explicit and extensible
- **Roster status on `roster_entry`, not on individual usher rows** — the status represents the Community's commitment to the Celebration, not individual names
- **Snapshot denormalization on `roster_entry`** — `communityName` + `wilayahName` stored at assignment time; audit trail survives future renames
- **Optimistic locking on `Roster.version`** — prevents silent corruption when two PETA members edit simultaneously
- **`applyTransition` as a pure function** — no I/O, fully unit-testable, all state-guard logic in one place

---

## Legacy Domain Model Reference

> **Keep this section until all legacy routes are migrated.** The patterns below describe the old model still used by `admin/tatib`, `f/tatib`, `lingkungan`, and most admin routes.

### Physical Hierarchy (Old)

```
Church
 └─ ChurchZoneGroup  (table: church_zone_group)
      └─ ChurchZone  (table: church_zone)
           └─ ChurchPosition  (table: church_position)
                columns: id, church_zone_id, name, code, is_ppg (boolean),
                         type: 'usher'|'prodiakon'|'peta', sequence, active
```

**Pattern:** flat table per level, joined by FK. No abstraction — each level has its own query in `SQLiteDbEvent.ts`.

**Known issue:** `type` column conflates ministry identity with position type. `is_ppg` on a station is a queue-manager hint, not committee membership. See `migrate.md § Phase 6` for the rename plan.

### Territorial Hierarchy (Old)

```
Church                          (shared with new model; bridge: church.parish_id nullable)
 └─ Wilayah  (table: wilayah)  (bridge: wilayah.parish_id nullable FK to new parish)
      └─ Lingkungan  (table: lingkungan)
```

**Pattern:** denormalized strings on `event_usher` — `wilayah TEXT`, `lingkungan TEXT`. No FK, no stable identity. Leads to "BONY" ≠ "Bony" problem documented in `migrate.md § 6`.

### Usher Assignment (Old)

```typescript
// src/core/entities/Event.ts
export interface EventUsher {
  id: string;
  event: string;           // FK to event
  name: string;            // free-text — no Parishioner identity
  wilayah: string;         // denormalized string
  lingkungan: string;      // denormalized string
  position?: string;       // FK to church_position (nullable)
  isPpg?: number;          // 0|1 boolean — per-Mass collection role (PPG envelopes)
  isKolekte?: number;      // 0|1 boolean — per-Mass collection role (regular offertory)
  sequence?: number;
  active: number;
}
```

**Known issues:**
- `isPpg` / `isKolekte` are mutually exclusive per person but enforced only in UI, not schema.
- Free-text `name` means the same person can appear as multiple identities across submissions.
- `wilayah` / `lingkungan` strings drift; no FK integrity.

### Schedule Model (Old)

```typescript
// src/core/entities/Schedule.ts
export interface MassSchedule { // was: Mass (deprecated alias still exported)
  id: string;
  church: string;
  name: string;
  day: 'sunday' | 'monday' | … ;   // plain string day — no RecurrenceRule
  time: string | null;
  briefingTime: string | null;
  active: number;
}

// src/core/entities/Event.ts
export interface ChurchEvent {    // target name: Celebration
  id: string;
  church: string;
  mass: string;                   // FK to mass (MassSchedule)
  date: string;
  weekNumber?: number;
  isComplete?: number;            // boolean flag — target: derived projection
  type?: EventType;               // EventType.MASS | EventType.FEAST — target: split into LiturgyKind + LiturgicalRank
  active?: number;
}

export enum EventType {
  MASS  = 'mass',
  FEAST = 'feast',
}
```

### Event Zone PIC (Old)

```typescript
// Free-text PIC name per event × zone_group
export interface EventZonePic {
  id: string;
  event: string;     // FK to event
  zoneGroup: string; // FK to church_zone_group
  name: string;      // free-text PETA member name
  active: number;
}
```

**Target:** replaced by PETA `RosterUsher` with `section_id` attribute (see `migrate.md § Phase 10`).

### Migration Status Summary

| Old Entity | New Entity | Status |
|---|---|---|
| `Mass` / `mass` table | `MassSchedule` | 🔄 TypeScript alias done; DB table unchanged |
| `ChurchEvent` / `event` table | `Celebration` | ❌ Not renamed |
| `ChurchZoneGroup` / `church_zone_group` | `Section` / `section` | 🔄 New table exists; old retained |
| `ChurchZone` / `church_zone` | `Zone` / `zone` | 🔄 New table exists; old retained |
| `ChurchPosition` / `church_position` | `Station` / `station` | 🔄 New table exists; old retained |
| `EventUsher` / `event_usher` | `RosterUsher` / `roster_usher` | 🔄 New table exists; old retained |
| `Lingkungan` / `lingkungan` | `Community` / `community` | 🔄 New table exists; old retained |
| `is_ppg` / `is_kolekte` booleans | `MinistryRole.code` | 🔄 New model uses roles; legacy booleans retained |
| `EventZonePic` / `event_zone_pic` | PETA `RosterUsher` with `section_id` | ❌ Not migrated |
| Parish as string on Church | `Parish` entity | 🔄 New table; bridge FK on church/wilayah |

See `doc/migrate.md` for phase-by-phase plan and per-phase status.
