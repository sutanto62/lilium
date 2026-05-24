# Domain Ontology & Migration Plan

> Status: **Completed**
> Scope: Refactor the church-ministries-schedule domain model from the current denormalised, usher-centric structure toward a clean, ministry-extensible ontology with stable parishioner identity.

---

## Part I — Ontology

### 1. Context

The system manages liturgical scheduling for a Catholic parish. Six user-given concepts:

1. **Parish** — organisation that serves a region (e.g. Paroki Alam Sutera).
2. **Church** — building belonging to a parish.
3. **Mass** — Catholic prayer session: yearly (Easter, Ash Wednesday, Palm Sunday…), weekly, daily, and special (1st Friday).
4. **Usher** — minister who guides laity to seats.
5. **Zone** — area in church served by an usher.
6. **Zone Group** — set of zones, indicating a part of the church (Church, Basement, Park Lot) used when main church is over capacity.

Plus three Indonesian-Catholic specifics confirmed during analysis:

- **PPG** (Panitia Pembangunan Gereja) — church building committee. Governance, not ministry.
- **PPKG** (Panitia Pembangunan Komplek Gereja) — church-complex building committee. Governance, not ministry.
- **PETA** (Pengurus Tata Tertib) — a separate ministry whose primary work is **authoring the Roster** (assigning Lingkungan → Celebration). PETA members occupy designated observation posts during Mass and fill in at empty Usher stations when zones are short-staffed. PIC (zone-group coordinator) is always a PETA member.

### 2. The four orthogonal axes (plus a fifth)

The current model collapses these axes into overlapping entities. Untangling them gives the ontology:

| Axis | Question | Examples |
|---|---|---|
| **WHERE (physical)** | Spatial — building & ministry assignment | Parish → Church → Section → Zone → Station |
| **WHERE (territorial)** | Governance — community assignment | Parish → Wilayah → Community *(Lingkungan)* |
| **WHAT** | Kind of liturgy | Mass, Adoration, Vespers, Stations of the Cross |
| **WHEN** | Concrete time | Celebration on a date, with rank & cadence |
| **WHO (ministry)** | Liturgical service role | Usher, PETA, Lector, Cantor, EMHC (*Prodiakon*), Altar Server (*Misdinar*) |
| **WHO (affiliation)** | Committee / governance | Church Building Committee (*PPG*), Parish Facilities Committee (*PPKG*), Parish Council |

Critical: ministry and affiliation are **independent**. A person can be a minister, a committee member, both, or neither.

### 3. Recommended taxonomy

#### Tier 0 — Organisation (WHERE, hierarchical)

```
Diocese
 └─ Parish              ← canonical org unit (Paroki)
     ├─ Church          ← physical building (a parish may have many)
     │   └─ Section     ← was ZoneGroup ("Main Nave", "Basement", "Overflow Tent")
     │       └─ Zone    ← service area assignable to ushers
     │           └─ Station  ← was ChurchPosition ("Door 1", "Side Aisle")
     └─ Wilayah
         └─ Community              ← TypeScript: Community; UI label: Lingkungan
             └─ Parishioner
```

Rationale:
- **Parish, not `church.parish: string`** — promote to a first-class entity. Indonesian: `Paroki` as UI label.
- **Section, not ZoneGroup** — "Section of the church" reads naturally; "ZoneGroup" is mechanical.
- **Station, not Position** — `Position` is a *liturgical posture* word (kneeling/standing/sitting). `Station` is canonical English usher terminology. Indonesian: `Pos`.
- **Wilayah stays as a proper noun** — canonical Indonesian Catholic territorial unit; no English equivalent. TypeScript type: `Wilayah`. UI label: *Wilayah*.
- **Lingkungan → `Community` in TypeScript** — the neighbourhood community unit maps to the English word "community" for code readability by future non-Indonesian contributors. UI label remains *Lingkungan* (proper noun displayed to users). Database table: `community`. TypeScript interface: `Community`.
- Stop denormalising Wilayah/Lingkungan as strings on assignments — they're properties of the *Parishioner*, not the *Assignment*.

#### Tier 1 — Liturgy (WHAT × WHEN)

```
LiturgyKind          (enum: Mass, Adoration, Vespers, StationsOfCross, …)
   │
MassSchedule         ← was Mass — recurring template ("Every Sunday 9am, English")
   │   has: RecurrenceRule, time, briefingTime, defaultZones, defaultLiturgyKind
   │
Celebration          ← was ChurchEvent — concrete occurrence on a date
   │   has: date, MassSchedule (or null for one-offs), LiturgicalDay, status
   │
LiturgicalDay        ← Ash Wednesday, Palm Sunday, 1st Friday, ferial weekday
       has: date, season, rank (Solemnity|Feast|Memorial|Weekday), propers
```

Rationale:
- **`Celebration`** for the dated instance. Canonical Catholic term; Indonesian: *Perayaan*. Far less ambiguous than `Event`.
- **`MassSchedule`** for the recurring template. Plain `Mass` overloads with the rite itself.
- **Split `EventType.MASS | FEAST`** into three orthogonal facets currently fused into a 2-value enum:
  - `LiturgyKind` (Mass vs Adoration vs Funeral): *what* is celebrated.
  - `LiturgicalRank` (Solemnity / Feast / Memorial / Weekday): the Church's *importance* classification.
  - `Cadence` (Daily / Weekly / Monthly / Annual / Special): how often it recurs.

#### Tier 2 — Ministries (WHO, liturgical service)

```
Ministry             (Usher, PETA, Lector, Cantor, EMHC/Prodiakon, AltarServer/Misdinar)
 └─ MinistryRole     refinement: Usher → {Regular, Kolekte, Processional, PPG, PPKG}

Minister             person who serves
 └─ MinistryMembership  Minister × Ministry (with qualifications, active flag)

Roster               the assembled artifact for one Celebration
 └─ RosterEntry      Community × Celebration (status: draft → submitted → confirmed)
     └─ RosterUsher  Minister × Station × Role ← was EventUsher
```

Rationale:
- **`RosterUsher`, not `EventUsher`** — the row is the usher's participation within a `RosterEntry` (one Community's commitment to one Celebration). "EventUsher" reads like "an usher who is an event," which is wrong. Nesting under `RosterEntry` makes the Community boundary explicit.
- **`Minister`, not `Usher`** — generalise. Usher is one *value* of `Ministry`. Unblocks scheduling lectors, cantors, prodiakon, misdinar without parallel pipelines.
- **`isKolekte` should be `MinistryRole.Kolekte`** — kolekte rotates per event; that is genuinely a per-assignment role.
- **PETA is a separate `Ministry`** — *Pengurus* (administrator) is the giveaway: PETA's primary work is **authoring the Roster** (assigning Lingkungan → Celebration). They occupy designated observation posts (`Station(ministry='peta')`) during Mass and fill in at empty Usher stations when zones are short-staffed.
- **EMHC (Prodiakon) is a separate `Ministry`** — it serves at the altar, not in usher zones. Stations declare which Ministry serves there.
- **`pic` consolidates into a PETA `RosterUsher` with `section_id`** — PIC is always a PETA member coordinating one Section for one Celebration. The free-text `event_zone_pic.name` becomes a `section_id` attribute on the PETA member's `RosterUsher` row; same information, properly referenced through the `Roster → RosterEntry → RosterUsher` chain.
- **`Roster` as a first-class entity** — currently derived (`CetakJadwalResponse`). Promote it: it has publish state, history, version.

**Ministry catalog values (canonical English ↔ Indonesian):**

```
Ministry (catalog):
  Usher                — id: usher          — Tatib / Penyambut
  PETA                 — id: peta           — Pengurus Tata Tertib
                         (en: Liturgical Ministry Coordinator / Tatib Coordinator)
                         Primary service: authoring Rosters — assigning
                         Lingkungan → Celebration.
                         Secondary service: standing at designated PETA stations
                         during Mass; backing up Usher when stations are empty.
  EMHC                 — id: emhc           — Prodiakon
                         (Extraordinary Minister of Holy Communion;
                          Canon 910 §2, Immensae Caritatis 1973.
                          Avoid "Eucharistic Minister" — that term refers
                          to ordained ministers.)
  AltarServer          — id: altar_server   — Misdinar
                         (distinct from the instituted "Acolyte" ministry,
                          which since Spiritus Domini 2021 is a formal
                          lay ministry separate from altar serving.)
  Lector               — id: lector         — Lektor                 (future)
  Cantor               — id: cantor         — Pemazmur               (future)
  ExtraordinaryAcolyte — id: acolyte        — Akolit                 (future)

MinistryRole (refines Ministry — values vary per ministry):
  Usher → { Regular,
            Kolekte       — offertory collection during Mass,
            Processional  — offertory procession,
            PPG           — PPG envelope collection (Panitia Pembangunan Gereja),
            PPKG          — PPKG charity collection after Mass (Panitia Pembangunan Komplek Gereja)
          }
  EMHC  → { Regular, Lead }
  PETA  → { Regular }      — coordination is the ministry itself; no sub-roles
  …
```

Notes:
- All three collection roles use Indonesian proper nouns (`Kolekte`, `PPG`, `PPKG`), consistent with the i18n policy for parish-canonical acronyms.
- `MinistryRole.PPG` and `Committee.code='PPG'` are **distinct concepts on different axes**: the role is "collecting PPG envelopes at this Mass" (per-celebration), the committee is "on the building committee" (governance affiliation). Same for PPKG. A person can have either, both, or neither — they don't imply each other.
- PETA is its own `Ministry` (not a role) — its primary service is authoring the Roster.

#### Tier 3 — Affiliations (WHO, governance)

```
Parishioner
 └─ CommitteeMembership   Parishioner × Committee × dateRange

Committee  (catalog)
 ├─ PPG     Panitia Pembangunan Gereja
 ├─ PPKG    Panitia Pembangunan Komplek Gereja
 ├─ DPP     Dewan Pastoral Paroki — future
 └─ …
```

Rationale:
- **PPG / PPKG are NOT ministries** — they're administrative/governance committees. They're modelled here for completeness; **today's roster does not actually need them** (see note below).
- Committee memberships have **start/end dates**. Boolean flag can't express "Pak Budi was PPG until 2024."
- Person can be in **both** PPG and PPKG (and more, in future) — boolean tags break at N=3.

**Important separation of concerns.** The PPG/PPKG markers shown on the printed roster today are **collection-role indicators**, not committee badges:
- `MinistryRole.PPG` / `MinistryRole.PPKG` (Tier 2) → drives roster display ("who collects PPG envelopes / PPKG charity at this Mass").
- `Committee` / `CommitteeMembership` (Tier 3) → governance metadata only; does not feed roster rendering.

Committee tables exist so the system *can* track membership when needed, but the scheduling pipeline doesn't require them to be populated. If your parish only cares about the per-Mass collection role, leave Committee/CommitteeMembership empty — the roster will still render correctly via `MinistryRole`.

**Committee catalog values (canonical English ↔ Indonesian):**

```
Committee (catalog):
  ChurchBuildingCommittee   — code: PPG    — Panitia Pembangunan Gereja
                              (en alt: Church Fabric Committee — UK/formal,
                               where "fabric" denotes the church's physical
                               structure. Scope: church building proper.)
  ParishFacilitiesCommittee — code: PPKG   — Panitia Pembangunan Komplek Gereja
                              (en alt: Parish Estate Committee — UK/formal.
                               Scope: parish complex — hall, rectory, school,
                               parking, gardens. Broader than PPG.)
  ParishCouncil             — code: DPP    — Dewan Pastoral Paroki      (future)
                              (en: Parish Pastoral Council)
  FinanceCouncil            — code: DPK    — Dewan Keuangan Paroki      (future)
                              (en: Parish Finance Council; Canon 537)
```

The `committee.code` column stores the Indonesian acronym (PPG, PPKG, …) as the stable identifier — this matches existing user-facing terminology and historical analytics. The `name` column stores the full Indonesian name. Canonical English names live in i18n strings, not in the DB.

#### Tier 4 — Calendar (deferred)

```
LiturgicalYear → Season → LiturgicalDay
RecurrenceRule (RFC 5545 RRULE-ish): "1st Friday monthly", "every Sunday"
SpecialObservance: Ash Wednesday, Palm Sunday, Holy Thursday, Easter Vigil
```

Reserve the names; defer implementation until product needs it.

### 4. Comparison: current vs recommended

| Concept (user's word) | Current code | Recommended | Why |
|---|---|---|---|
| Parish | `church.parish: string` | `Parish` entity | Canonical org unit; should own churches, regions, ministries |
| Church | `Church` | `Church` ✓ | Perfect |
| Mass (recurring template) | `Mass` | `MassSchedule` | "Mass" is overloaded with the rite |
| Mass (date instance) | `ChurchEvent` | `Celebration` | "Event" is generic; "Celebration" is canonical |
| Mass type | `EventType.MASS \| FEAST` | `LiturgyKind` + `LiturgicalRank` + `Cadence` | Three orthogonal axes fused into one enum |
| Usher (person) | implicit `EventUsher.name` | `Minister` | Generalise beyond usher |
| Usher assignment | `EventUsher` | `Assignment` | Names the relationship, not "an usher who is an event" |
| Roster (the printout) | `CetakJadwalResponse` (derived) | `Roster` Aggregate Root with `RosterEntry` (Community × Celebration) + `RosterUsher` (individual) | Lifecycle `draft → submitted → confirmed`; Community commitment tracked per `RosterEntry` |
| Zone | `ChurchZone` | `Zone` ✓ | Conventional |
| Zone Group | `ChurchZoneGroup` | `Section` | Reads naturally; "ZoneGroup" is mechanical |
| Position-within-zone | `ChurchPosition` | `Station` (Pos) | "Position" collides with liturgical posture / job role |
| PIC | `event_zone_pic` (free-text name per zone-group) | PETA `Assignment` with `coordinates_section_id` | PIC is always a PETA member coordinating one Section for one Celebration; consolidate via Assignment |
| Wilayah | `Wilayah` | `Wilayah` ✓ | Proper noun; kept as TypeScript type name |
| Lingkungan | `Lingkungan` | `Community` (TypeScript) / *Lingkungan* (UI) | TypeScript uses English for code readability; UI label stays Indonesian |
| `isPpg` flag | bool on `EventUsher` | `MinistryRole.PPG` on Assignment (per-Mass role) — *and optionally* `CommitteeMembership(PPG)` for governance metadata | Today's column was always functionally a role (PPG envelope collection); committee membership is a separate, optional, manually-curated concept |
| `isKolekte` flag | bool on `EventUsher` | `MinistryRole.Kolekte` on Assignment | Genuinely per-assignment role |
| (none — new) | — | `MinistryRole.PPKG` on Assignment | Per-Mass charity collection role for PPKG fund |
| PETA | `ChurchPosition.type='peta'` | `Ministry.PETA` (sibling to `Usher`, `EMHC`) | "Pengurus" = administrator; PETA's primary work is authoring the Roster, not ushering |
| Prodiakon | `ChurchPosition.type='prodiakon'` | `Station.ministry = EMHC` | Separate ministry, separate stations (at the altar) |
| (none) | — | `Parishioner` | Person attached to Lingkungan; not every minister is a system user |
| (none) | — | `Committee`, `CommitteeMembership` | PPG/PPKG and future governance bodies |
| (none) | — | `Availability` | When a minister can/can't serve (future) |

### 5. Smaller architectural notes

1. **`core/entities/Schedule.ts` is a junk drawer.** Contains Mass + Church + Zone + Wilayah + Lingkungan + Position + Usher — none of which *are* schedules. Split into `Parish.ts` (territorial hierarchy: Parish, Wilayah, Community), `Facility.ts` (physical hierarchy: Church, Section, Zone, Station), `Liturgy.ts` (WHAT axis: MassSchedule, Celebration), `Ministry.ts`, and `Roster.ts`. See `design-pattern.md` for the full interface shapes.

2. **`isComplete` on a celebration** ("100% assigned ushers") should be a derived projection, not a column. As ministries multiply, "complete" needs a per-ministry definition.

3. **`Mass.day: 'sunday'`** as a string literal-or-string is fragile. Use a proper `Weekday` enum, or — better — let `MassSchedule` hold a `RecurrenceRule` so "1st Friday monthly" works without a new field.

4. **`ChurchPosition.type: 'usher' | 'prodiakon' | 'peta'`** has the right values but the wrong column name. All three are sibling **Ministries**, not "types" of one thing — usher stations sit in zones, prodiakon stations sit at the altar, PETA stations are designated observation posts. Rename the column to `ministry`; values stay as-is and become extensible (`lector`, `cantor`, `altar_server` slot in cleanly).

### 6. Empirical evidence: PPG drift

The ontology recommendation for PPG (membership, not flag) is grounded in a production data audit (snapshot date pre-migration):

```
event_usher rows (active=1):                       9,107
  marked is_ppg=1:                                 1,526
  marked is_kolekte=1:                             3,601
  both flags true (mutex violation):                   0   ✓
  is_ppg IS NULL:                                      0   ✓
  distinct name strings:                           3,748

(name, lingkungan) pairs serving 2+ events:        1,880
  with inconsistent is_ppg across events:            659  ← 35%
  with inconsistent is_kolekte across events:     1,037  ← 55% (some legitimate)
```

**~35% of repeat servers have inconsistent PPG status across their assignments.** Drift is the dominant pattern, not the edge case.

> **Reinterpretation note (post-PETA / role-correction).** The original framing of these numbers was "PPG committee membership data went stale." After clarifying that `is_ppg=1` was always functionally a per-Mass *role* (PPG envelope collection), the numbers are equally explained by "the role assignment was inconsistent across submissions" — different submitters guessing differently whether a person was collecting PPG envelopes that Mass. **The drift signature is real either way**, but the fix is no longer "extract committee membership properly"; it's "model the per-Mass role explicitly as `MinistryRole.PPG` so the form has a clear, single-purpose field." Committee-membership tables are kept as optional governance metadata, not as the roster's source of truth.

Concrete examples:
```
name        events  ppg=yes  ppg=no   first_date   last_date
Yuli           11       2       9     2025-06-08   2026-05-03
Bony           10       0      10     2025-06-15   2026-05-03
Christian      10       1       9     2025-06-08   2026-05-03
Joseph         10       1       9     2025-01-18   2026-03-15
Susiana        10       3       7
Josephine       9       5       4                  ~50/50
Anita           8       4       4                  ~50/50
```

The 50/50 patterns aren't membership changes — they're two submitters guessing differently.

Bonus: name-spelling variants (8+ pairs) — `BONY`/`Bony`, `Widodo`/`widodo`, `ELLY ROSANI`/`Elly Rosani` — are stored as different humans because identity isn't tracked.

**Why drift is structurally inevitable:**

| Reality | Implication |
|---|---|
| No `parishioner` / `person` table | No identity. "Yuli" is just a string. |
| `name` is plain text, no FK | "BONY" and "Bony" are different humans to the system |
| No membership/committee table | No source of truth for "is X currently PPG" |
| `is_ppg` set via checkbox in `/f/tatib/UshersList.svelte` | Defaults to `false` every submission; relies on memory |
| No admin UI to update historical rows | Even if membership changes, old rows can't be reconciled |

The flag is **manually re-asserted on every assignment**. Nothing pulls from a master record because there is no master record.

### 7. Indonesian / English policy

To resolve the recurring "what name goes where" tension, fix the boundary like this:

| Layer | Language | Examples | Reason |
|---|---|---|---|
| Database table & column names | English | `parishioner`, `committee_membership`, `mass_schedule`, `celebration` | Matches the rest of the schema; DBAs and migrations read English |
| TypeScript types & enum members | English (or Indonesian proper noun where canonical) | `Ministry.EMHC`, `Ministry.PETA`, `MinistryRole.Kolekte`, `Committee.code = 'PPG'` | Code is read by future contributors who may not speak Indonesian; proper-noun acronyms (PETA, PPG, Kolekte) keep their native form |
| Catalog row `code` (stable identifier) | **Indonesian acronym** | `PPG`, `PPKG`, `DPP`, `DPK` | These are proper nouns in the parish; preserves user-facing continuity & historical analytics |
| Catalog row `name` (display) | Indonesian (full) | `Panitia Pembangunan Gereja` | What parishioners actually see in admin UI |
| User-facing UI strings (Svelte) | Indonesian | "Misa", "Jadwal", "Tatib", "Wilayah", "Lingkungan", "Prodiakon", "PPG" | Users are Indonesian; do not translate |
| Domain proper nouns kept in code | Indonesian | `Wilayah`, `Paroki` (entity types) | No precise English equivalent; canonical Indonesian Catholic terms. Note: `Lingkungan` → `Community` in TypeScript (English), but UI label stays *Lingkungan* |
| Comments & ADRs | English (with Indonesian glosses) | "EMHC (*Prodiakon*)" | Discoverable for future English-speaking contributors |

**Single-source-of-truth rule:** if a label appears in the UI in Indonesian, it is *not* hard-coded in TypeScript — it lives in i18n / catalog rows. The TypeScript layer uses canonical English (`EMHC`, `AltarServer`); the i18n layer maps to `Prodiakon`, `Misdinar` for display.

**Migration implication:** when Phase 1 lands the `committee` and `ministry` catalogs, the seed values follow this rule. `committee.code = 'PPG'` (Indonesian, stable), `committee.name = 'Panitia Pembangunan Gereja'` (Indonesian, display), TypeScript enum `Committee.ChurchBuildingCommittee` (English, code-side).

---

## Part II — Migration Plan

### Goals

1. **Eliminate PPG drift** — move from per-assignment booleans to `Parishioner` + `CommitteeMembership`.
2. **Decouple ministries from ushers** — extensible to lectors, prodiakon, misdinar without parallel pipelines.
3. **Disambiguate overloaded names** — `Mass` (recurring vs instance), `Position` (station vs liturgical posture), `Event` (generic vs celebration).
4. **Keep the system shippable on every commit** — no big-bang. Every phase passes `npm run check`, `npm run lint`, all tests.

### Non-goals

- **Not** rebuilding the liturgical calendar (Tier 4). Defer until product need surfaces.
- **Not** introducing multi-parish (Parish as first-class) until current Paroki Alam Sutera workflow is stable.
- **Not** touching `routes/admin/settings/*` UI labels in Indonesian. Backend names change; UI keeps user-facing terms (Misa, Wilayah, Lingkungan, PPG).
- **Not** migrating analytics event names — the recent analytics refactor is fresh; let it settle.

### Sequencing overview

Ordered by **value-per-risk**, not by ontology elegance. Drift fix lands first; pure renames go last.

> **Implementation note:** The approach diverged from strict in-place migration. Phases 7–10 were implemented as a **parallel new domain model** (used by `admin/settings` routes) rather than migrating legacy routes. Legacy routes (`admin/tatib`, `f/tatib`, `lingkungan`) still use old tables. Phases 1–6 apply to the legacy model and remain pending.

| # | Phase | Outcome | Status |
|---|---|---|---|
| 0 | ADR + freeze decisions | Names locked | ❌ Not started — no `doc/adr/` yet |
| 1 | Add `parishioner` + `committee_membership` (additive) | Drift fixable | ❌ Not started |
| 2 | Backfill Parishioner identity (only) | Stable identity for ushers | ❌ Not started |
| 3 | Read PPG/PPKG from `MinistryRole` | Per-Mass roles drive display | 🔄 Partial — new domain uses `ministry_role`; legacy `event_usher.is_ppg` retained |
| 4 | Write `parishioner_id` + `role` on new assignments | Identity + role captured | ❌ Not started |
| 5 | Drop legacy `is_ppg` / `is_kolekte` columns | Conflated booleans gone | ❌ Not started |
| 6 | Split `church_position.type` into `ministry` + `role` | Prodiakon/PETA modelled correctly | ❌ Not started — column still named `type` |
| 7 | Rename `event_usher` → `roster_usher`, `EventUsher` → `RosterUsher` | Domain language cleanup | 🔄 Partial — `roster_usher` exists in new domain; `event_usher` retained for legacy |
| 8 | Rename `Mass`→`MassSchedule`, `ChurchEvent`→`Celebration` | Domain language cleanup | 🔄 Partial — `MassSchedule` done (`Mass` deprecated alias); `ChurchEvent` still exists |
| 9 | Rename `ChurchZoneGroup`→`Section`, `ChurchPosition`→`Station` | Domain language cleanup | 🔄 Partial — `section`/`station` in new domain; `church_zone_group`/`church_position` retained |
| 10 | Promote `Roster` (replace `CetakJadwalResponse`) | Roster lifecycle (draft/published) | 🔄 Partial — `roster`, `roster_entry`, `roster_usher` tables exist; feature-gated |

- **Phases 0–5** are the **value plan** — they fix real bugs.
- **Phases 6–9** are the **language plan** — they make code easier to read and extend.
- **Phase 10** is **net-new feature scaffolding** — only do it when a product need lands.

You can stop after Phase 5 and have a meaningfully better system. Phases 6–10 are optional polish.

---

### Phase 0 — ADR + decisions freeze `❌ Not started`

**Outcome:** A committed `doc/adr/0001-domain-ontology.md` with the comparison table, rejected names, and rationale. Future "should we use X?" answered by reference.

**Scope:**
- Capture: `Celebration`, `MassSchedule`, `Parishioner`, `CommitteeMembership`, `Ministry`, `MinistryRole`, `Station`, `Section`, `Roster`, `Assignment`.
- Capture rejected alternatives: `Service`, `LiturgicalEvent`, `Position`, `ZoneGroup`, `EventUsher`.
- Decide Indonesian-vs-English policy: keep `Wilayah`, `Lingkungan`, `Paroki`, `PPG`, `PPKG`, `PETA`, `Misa` as proper nouns; everything else English.

**Verify:** ADR reviewed and merged before any schema work.

**Risk:** None. Cheap insurance against bikeshedding mid-migration.

---

### Phase 1 — Add `parishioner` + `committee_membership` (additive) `❌ Not started`

**Outcome:** New tables exist; nothing reads or writes from them yet.

**Schema (Drizzle):**

```ts
// New
parishioner: id, name, name_normalized, community_id (FK), wilayah_id (FK),
             active, created_at, notes
committee:   id, code (PPG|PPKG|…), name, active
committee_membership: id, parishioner_id (FK), committee_id (FK),
                      start_date, end_date (nullable = current), active
```

Why these fields:
- `name_normalized` (lowercase, trimmed, unicode-normalised) → enables fuzzy lookup during backfill and form picker.
- `committee.code` enum-like text → matches existing `is_ppg`/future `is_ppkg` semantics.
- `start_date` / `end_date` → expresses "Pak Budi was PPG until 2024" — currently unrepresentable.

**Steps:**
1. Add tables to `src/lib/server/db/schema.ts`.
2. Generate migration: `npm run db:generate`.
3. Apply: `npm run db:migrate`.
4. Add `core/entities/Parishioner.ts`, `core/entities/Committee.ts`.
5. Add repository methods (no-op consumers yet) — `findParishionerById`, `listParishionersByLingkungan`, `listActiveCommitteeMembershipsAt(date)`.
6. Add adapter implementations.

**Verify:**
- `npm run check` clean.
- New tables empty in `db:studio`.
- Existing tests still pass; no behaviour change.

**Rollback:** `npx drizzle-kit drop` on the new migration. Tables are leaf-level — no cascading damage.

---

### Phase 2 — Backfill Parishioner identity (only) `❌ Not started`

**Outcome:** `parishioner` table populated by deduplicating `(name, lingkungan)` strings from `event_usher`. `committee_membership` stays empty. `event_usher.parishioner_id` populated for all historical rows.

**Scope decision:** Per project decision, **`is_ppg` history is NOT migrated**. Going forward:
- `MinistryRole.PPG` and `MinistryRole.PPKG` are populated **manually per assignment** via the form (Phase 4).
- `Committee` / `CommitteeMembership` start empty; populated manually by an admin if/when the parish wants to track governance membership.
- Historical `event_usher.is_ppg=1` flags are preserved on the legacy column (read-only for old rosters); **not copied** into the new role or committee tables.

This shrinks Phase 2 to just **identity deduplication** — still valuable (Phase 4 needs a parishioner picker), but no PPG disambiguation work.

**Steps:**
1. **Dry-run script** in `scripts/backfill-parishioners.ts`:
   - Group `event_usher` by `(lower(trim(name)), lingkungan)`.
   - For each group, propose one `parishioner` row.
   - Output a TSV: `proposed_parishioner_name | lingkungan | name_variants | row_count | first_seen | last_seen`.
2. **Light human review** — merge known case-variant duplicates (`BONY` + `Bony`, `WIDODO` + `widodo`, etc.). The audit found 8+ such pairs but more may surface. Effort: a few hours, not days.
3. **Apply script** writes `parishioner` rows from the reviewed TSV.
4. **`event_usher` gets a new nullable `parishioner_id` column** (additive). Backfill it from the `(name, lingkungan)` → `parishioner.id` mapping.
5. Commit the TSV to `doc/migrations/2026-XX-parishioner-backfill.tsv` for audit.

**Verify:**
```sql
-- Every event_usher row links to a parishioner
SELECT COUNT(*) FROM event_usher WHERE parishioner_id IS NULL AND active = 1;  -- expect 0

-- Distinct parishioners per lingkungan looks reasonable (sanity, not strict)
SELECT lingkungan, COUNT(DISTINCT parishioner_id) FROM event_usher GROUP BY lingkungan;
```

**Effort revised:** ~0.5–1d (was 2–5d). The bulk of the original estimate was disambiguating 659 PPG-inconsistent rows, which is now skipped by design.

**Risk:** Lower than original estimate. Identity deduplication mistakes are still sticky (wrong merges create wrong people), but the surface is much smaller — only ~8+ obvious case-variants, not 659 ambiguous PPG flips.

**Rollback:** Truncate `parishioner`; null out `event_usher.parishioner_id`. Re-run.

---

### Phase 3 — Read PPG/PPKG from `MinistryRole` (per-Mass roles) `🔄 Partial`

**Outcome:** Roster rendering, the print view (`CetakJadwalResponse`), and the lingkungan view derive PPG/PPKG markers from `MinistryRole.role` on the assignment, not from the legacy `event_usher.is_ppg` boolean. Historical celebrations (rows created before the cutoff) continue reading the legacy column for backward-compatible display.

**Touch points:**
- `src/lib/server/adapters/SQLiteDbEvent.ts` — lines 509, 551, 594, 728 (read paths) and the `findCetakJadwal` / roster builders around 800–880, including the `processSpecialUshers` calls for "Menghitung uang amplop PPG" / "Menghitung uang kolekte" (lines 803–804).
- `src/components/jadwal/JadwalKonfirmasiDetail.svelte` — line 97 (display).
- `src/routes/lingkungan/UsherDutyTable.svelte` — lines 52, 164, 175.
- `src/lib/utils/usherValidation.ts` — line 5.

**Approach:**
- Behind a Statsig gate (`use_role_for_ppg_display`) so you can flip back if display regressions appear.
- Read precedence: if `assignment.role IN ('ppg', 'ppkg', 'kolekte')`, use that. Else fall back to the legacy `is_ppg` / `is_kolekte` columns for historical celebrations.
- No shadow comparison needed — the new model is the source of truth from cutoff onwards; historical rows are display-only and not expected to match anything.

**Verify:**
- Statsig gate off → behaviour unchanged (legacy boolean path).
- Statsig gate on → new celebrations created after Phase 4 launch show correct PPG/PPKG markers from `role`; historical celebrations show their original markers from legacy columns.
- Spot-check: pick 3 celebrations from before cutoff and 3 after; visual diff of printed roster.

**Risk:** Display regressions if the fall-through to legacy columns is wrong for transitional rows. Mitigated by the gate and the legacy column being preserved.

---

### Phase 4 — Write `parishioner_id` and `role` on new assignments `❌ Not started`

**Outcome:** New rows in `event_usher` carry `parishioner_id` (identity) and `role` (per-Mass collection role). The lingkungan submission form picks from a parishioner list, not free-text, and replaces the two-checkbox PPG/Kolekte UI with a five-option role selector.

**Touch points:**
- `src/routes/f/tatib/+page.svelte` and `UshersList.svelte` — currently free-text name + two mutually-exclusive checkboxes (PPG, Kolekte). Switch to:
  - **Name field** → typeahead / select picking from `listParishionersByLingkungan`.
  - **Role field** → single-select (radio or dropdown): `Regular | Kolekte | PPG | PPKG | Processional`. Default `Regular`.
- `src/lib/server/adapters/SQLiteDbEvent.ts` line 88 (`persistEventUshers`) — write `parishioner_id` and `role`. Stop writing `is_ppg` / `is_kolekte` (legacy columns retain their data for historical rows but are no longer populated).
- Add "Add new parishioner" affordance in the form for genuinely new people. New parishioner is created in the same transaction.

**Verify:**
- Submitting the form creates `event_usher` row with non-null `parishioner_id` and a valid `role` value.
- Submitting a person not in the list creates a `parishioner` row first, then references it.
- Role selector preserves mutual exclusion (a person collects one thing per Mass).
- Existing assignments load correctly when a returning rep edits them.

**Risk:** UX shift on two axes simultaneously (name picker + role selector). Mitigations:
- Allow ad-hoc add-new for parishioners in the same screen.
- Keep `name` text column on `event_usher` for now (denormalised display). Drop in a later phase.
- Phase 4 lands behind a Statsig gate (`parishioner_picker_form`) so old form remains available if rollout reveals issues.

---

### Phase 5 — Deprecate legacy `event_usher.is_ppg` / `is_kolekte` columns `❌ Not started`

**Outcome:** Legacy boolean columns are dropped from `event_usher`. PPG/PPKG/Kolekte are derived purely from `MinistryRole.role`. PPG-on-station (`church_position.is_ppg`) is a separate concept and stays — it's a station-property used by the queue manager.

**Pre-conditions:**
- Phase 4 has been live for at least 4 weeks; all new assignments use `role`.
- The Statsig gate `use_role_for_ppg_display` (Phase 3) is on globally with no display regressions reported.
- A decision on **historical roster fidelity**: drop the column entirely (history loses PPG markers) or copy `is_ppg=1` rows into `assignment.role='ppg'` as a one-time migration before drop. Recommendation: **copy then drop** — preserves historical roster appearance with one-line SQL, no manual review needed.

**Steps:**
1. (Optional, recommended) One-time copy: `UPDATE event_usher SET role='ppg' WHERE is_ppg=1 AND role IS NULL; UPDATE event_usher SET role='kolekte' WHERE is_kolekte=1 AND role IS NULL;`. This is *not* the disambiguation backfill from Phase 2 — it's a literal value copy with no semantic interpretation. Historical PPG = whatever was recorded; we do not try to recover committee membership.
2. Remove `isPpg` / `isKolekte` from `core/entities/Event.ts` (`EventUsher`), `Usher.ts` (`UsherResponse`), `Schedule.ts` (`Usher`).
3. Update queue manager to read `role` instead of the boolean columns.
4. Update all tests that reference `isPpg` / `isKolekte` on `event_usher`.
5. Drop columns: `ALTER TABLE event_usher DROP COLUMN is_ppg; ALTER TABLE event_usher DROP COLUMN is_kolekte;`.
6. Remove the Statsig gate from Phase 3.

**Verify:**
- `rg "isPpg|is_ppg" src/` returns matches only on `church_position` (station-property, intentional) and possibly `parishioner` / `committee_membership` if those tables use it.
- Roster outputs (text & cetak) compare identical against pre-migration baseline for a sample of historical celebrations (assuming step 1 was performed).

**Risk:** Once columns are dropped, the original data is gone. Keep a `db/lilium-pre-phase5.db` snapshot.

> **Stop point.** If you only want the role/identity fix, **stop here**. Phases 6–10 are language hygiene and feature scaffolding.

---

### Phase 6 — Rename `church_position.type` → `ministry`, add `role` to assignments `❌ Not started`

**Outcome:** A station declares which **ministry** serves there (`usher`, `prodiakon`, `peta`, future: `lector`, `cantor`); an assignment declares the **role** within that ministry (`regular`, `collector`/Kolekte, `processional`). All three current `type` values are already sibling Ministries — they keep their values, only the column name changes.

**Schema:**
```sql
-- on church_position (will be renamed to station in Phase 9):
ALTER TABLE church_position RENAME COLUMN type TO ministry;
-- values unchanged: 'usher' | 'prodiakon' | 'peta'
-- (extensible for future: 'lector', 'cantor', 'altar_server', …)

-- on event_usher (will be renamed to assignment in Phase 7):
ALTER TABLE event_usher ADD COLUMN role TEXT;
-- 'regular' | 'kolekte' | 'processional' | 'ppg' | 'ppkg'
```

**Backfill:**
- `church_position.ministry := church_position.type` (literal copy; no semantic change).
- `event_usher.role` defaults to `NULL` for all existing rows. New rows from Phase 4 onwards populate it via the form. The one-time copy from `is_kolekte` and `is_ppg` happens at Phase 5 cutover (see Phase 5, step 1).

**Risk:** Lower than originally estimated. The queue manager's pairing logic (`QueueManager.ts` lines 141, 150–151, 348–349) keys on `pos.isPpg` — that's PPG (committee membership) drift, addressed in Phases 3–5. The Ministry rename here is mechanical and doesn't alter pairing semantics.

**Effort:** ~1d (revised down from 2d after PETA confirmed as ministry, not role).

**Recommended:** Land as its own PR, separate from Phase 7's table rename — keeps diffs reviewable.

---

### Phases 7–9 — Renames (codemod-friendly) `🔄 Partial`

**Outcome:** Code reads with canonical domain language.

These are mechanically the same: TypeScript symbol rename + import-path update + DB table rename + migration. Each is a single PR, scoped tightly.

| Phase | From | To | Touch sites (rough) |
|---|---|---|---|
| 7 | `event_usher` table, `EventUsher` interface | `roster_usher`, `RosterUsher` | ~40 files |
| 8 | `mass`, `Mass` (template) / `event`, `ChurchEvent` (instance) | `mass_schedule`, `MassSchedule` / `celebration`, `Celebration` | ~80 files (largest) |
| 9 | `church_zone_group`, `ChurchZoneGroup` / `church_position`, `ChurchPosition` | `section`, `Section` / `station`, `Station` | ~30 files |

**Approach for each:**
1. **`mcp__serena__rename_symbol`** for the TypeScript rename — Serena handles imports automatically.
2. **Drizzle migration** for the table rename: `ALTER TABLE old RENAME TO new` (SQLite supports this).
3. **Update schema.ts** + `npm run db:generate` (verify it produces the rename, not a drop+create).
4. **Single squashed commit** per phase — easy to revert.

**Indonesian UI labels stay unchanged** — `Misa`, `Jadwal`, `Tatib` continue to be user-facing strings. Only TypeScript symbols and table names change.

**Risk:** Conflict storm with parallel branches. Schedule each rename phase during a quiet week (no other in-flight work).

---

### Phase 10 — Promote `Roster` (optional, on-demand) `🔄 Partial`

Defer until you actually need:
- Draft vs. published distinction
- "Roster was published by X at time Y"
- Versioning ("we changed the May 17 roster on May 16")

When the time comes:
```sql
roster (
  id, event_id → event, created_by_user_id → user,
  version, status (draft|submitted|confirmed),
  created_at, updated_at
)

roster_entry (
  id, roster_id → roster,
  community_id → community,
  community_name,   -- snapshot at assignment time
  wilayah_id → wilayah,
  wilayah_name,     -- snapshot
  status (draft|submitted|confirmed),
  submitted_at, confirmed_at
)

roster_usher (
  id, roster_entry_id → roster_entry,
  name,                          -- plain string; future: parishioner_id FK
  ministry_role_id → ministry_role,
  station_id → station,          -- FK to Station (was church_position)
  sequence, created_at
)
```

**Status semantics:**
- `draft` — PETA has assigned the Community to the Celebration; Community has not yet submitted names.
- `submitted` — Community submitted usher names via the form; PETA has not yet confirmed.
- `confirmed` — PETA confirmed + ran station distribution.
- Overall `Roster.status` = minimum of all `RosterEntry.status` values.

**PIC consolidation.** Today, `event_zone_pic` stores a free-text name per `(event, zone_group)`. Since PIC is always a PETA member, in the new model:
- The PETA Community's `RosterEntry` (status: `confirmed`) contains a `RosterUsher` row for the PIC assigned to a PETA station.
- A `section_id` attribute on that `RosterUsher` row records which Section the PETA member coordinates for this Celebration — consolidating today's `event_zone_pic` table into a single structured reference.
- `event_zone_pic` is dropped after migration.

This means the same `RosterUsher` row answers both "who served at this station?" and "which Section did they coordinate?" — no more parallel free-text/structured tables.

**Authorisation falls out naturally:** only users with an active PETA `RosterEntry` can author/publish a Roster. Today this is implicit ("whoever has admin login"); making it explicit allows granting Roster-edit rights to PETA members without giving them full system admin.

Migrate `event_usher` rows to `roster_usher` (inside `roster_entry` rows) for each Celebration's roster. Migrate `event_zone_pic` rows by matching the PIC name string to a PETA `RosterUsher` and recording the `section_id`. Old code reading "all assignments for celebration X" becomes "confirmed `roster_entry` for X → `roster_usher` rows."

---

### Open questions

These need a decision before Phase 1 starts:

1. **Single Statsig gate or per-phase gates?** Phase 3 needs one (`use_membership_for_ppg_display`). Phase 4 could use one (`parishioner_picker_form`). Recommendation: **per-phase** — smaller blast radius for rollback.

2. **Where does the parishioner backfill happen?** Local machine + commit the TSV, or a scripts/admin route? Recommendation: **local + TSV** — keeps the audit trail in git, doesn't add a permanent admin UI for a one-time job.

3. **Display name format on roster?** Today the assignment carries the literal typed name. After migration, it carries `parishioner_id`. Should display use `parishioner.name` (canonical, but might differ from how the rep typed it) or keep a `display_name_override` per assignment? Recommendation: **canonical only** — that's the point of having identity.

4. **`Wilayah` / `Lingkungan` denormalisation on assignments.** Currently `event_usher.wilayah` and `event_usher.lingkungan` are TEXT. Once `parishioner` references both, the assignment columns are redundant. Drop them in Phase 5? Keep until Phase 7 (which renames the table anyway)?

5. **Phase 6 scope creep.** The queue-manager rewrite for ministry/role is the biggest semantic risk in the whole plan. Worth doing a spike branch first to confirm the approach? Recommendation: **yes** — even a half-day throwaway spike.

---

### Recommended next actions

1. Phase 0: draft the ADR.
2. Spike Phase 6 logic on a throwaway branch — confirm the queue manager pivots cleanly before committing to phases 1–5 (those are wasted effort if Phase 6 turns out infeasible).
3. Defer phases 7–10 to a separate planning conversation.
