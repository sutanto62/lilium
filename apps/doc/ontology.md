# Domain Ontology — Lilium Inter Spinas

> **Scope:** Canonical reference for domain concepts, names, and relationships.
> Implementation details live in `design-pattern.md` (patterns + interfaces) and `migrate.md` (migration plan).
> When a name or concept is in doubt, this document is the source of truth.

---

## The Five Orthogonal Axes

The domain collapses five independent axes into overlapping entities. Each axis answers a different question:

| Axis | Question | Canonical names |
|---|---|---|
| **WHERE (physical)** | Which building and ministry assignment point? | Parish → Church → Section → Zone → Station |
| **WHERE (territorial)** | Which governance community? | Parish → Wilayah → Community *(Lingkungan)* |
| **WHAT** | What kind of liturgy? | LiturgyKind, LiturgicalRank, Cadence |
| **WHEN** | Which concrete occurrence? | MassSchedule → Celebration → LiturgicalDay |
| **WHO (ministry)** | Who serves liturgically? | Ministry → MinistryRole → Minister |
| **WHO (affiliation)** | Who belongs to a governance committee? | Committee → CommitteeMembership |

Ministry and affiliation are **independent**. A person can be a minister, a committee member, both, or neither. The PPG/PPKG roles on a roster are per-Mass collection roles (WHO ministry axis), not committee badges (WHO affiliation axis).

---

## Tier 0 — Organisation (WHERE)

Two orthogonal branches share **Parish** as their administrative root. They must not be merged into one chain.

```
Parish
 ├─ WHERE (territorial)          ├─ WHERE (physical)
 │   └─ Wilayah                  │   └─ Church  (building)
 │       └─ Community            │       └─ Section
 │           └─ Parishioner      │           └─ Zone
 │                                │               └─ Station
```

### Territorial hierarchy

| Concept | TypeScript | UI label | DB table | Notes |
|---|---|---|---|---|
| Administrative root | `Parish` | *Paroki* | `parish` | Single row in this deployment (D1) |
| Territorial unit | `Wilayah` | *Wilayah* | `wilayah` | Indonesian proper noun — no English equivalent |
| Neighbourhood community | `Community` | *Lingkungan* | `community` | TypeScript uses English; UI label stays Indonesian |
| Individual parishioner | `Parishioner` | — | `parishioner` | Future — not yet implemented |

### Physical hierarchy

| Concept | TypeScript | UI label | DB table | Notes |
|---|---|---|---|---|
| Administrative root | `Parish` | *Paroki* | `parish` | Shared with territorial |
| Physical building | `Church` | *Gereja* | `church` | A parish may have many buildings |
| Named building section | `Section` | *Seksi* | `section` | Was `ChurchZoneGroup` |
| Service area | `Zone` | *Zona* | `zone` | Assignable to a ministry team |
| Assignment point | `Station` | *Pos* | `station` | Was `ChurchPosition`; "Position" collides with liturgical posture |

---

## Tier 1 — Liturgy (WHAT × WHEN)

```
LiturgyKind            (what is celebrated: Mass, Adoration, Vespers, …)
MassSchedule           recurring template  ← was Mass
    └─ Celebration     concrete occurrence ← was ChurchEvent
           └─ LiturgicalDay  (Ash Wednesday, Palm Sunday, ferial weekday, …)
```

| Concept | TypeScript | UI label | DB table | Notes |
|---|---|---|---|---|
| Recurring template | `MassSchedule` | *Misa* | `mass` | Was `Mass`; alias still exported |
| Concrete occurrence | `Celebration` | *Jadwal* | `event` | Was `ChurchEvent`; canonical Catholic term |
| Type of liturgy | `LiturgyKind` | — | — | Replaces `EventType.MASS\|FEAST`; future |
| Importance rank | `LiturgicalRank` | — | — | Solemnity / Feast / Memorial / Weekday; future |
| Recurrence pattern | `Cadence` | — | — | Daily / Weekly / Monthly / Annual / Special; future |

---

## Tier 2 — Ministries (WHO, liturgical service)

```
Ministry              (catalog: Usher, PETA, EMHC, AltarServer, Lector, Cantor)
 └─ MinistryRole      (sub-catalog: Regular, Kolekte, PPG, PPKG, Processional)

Minister              person who serves
 └─ MinistryMembership  Minister × Ministry (future)

Roster                assembled artifact for one Celebration
 └─ RosterEntry       Community × Celebration  (status: draft → submitted → confirmed)
     └─ RosterUsher   Minister × Station × Role  ← was EventUsher
```

### Ministry catalog

| Ministry | Code | UI label | Notes |
|---|---|---|---|
| Usher | `USHER` | *Tatib / Penyambut* | Station-bound; serves in zones |
| Liturgical Ministry Coordinator | `PETA` | *Pengurus Tata Tertib* | Primary work: authoring Rosters. Secondary: filling empty usher stations |
| Extraordinary Minister of Holy Communion | `EMHC` | *Prodiakon* | Altar stations, not usher zones |
| Altar Server | `ALTAR_SERVER` | *Misdinar* | Distinct from instituted Acolyte |
| Lector | `LECTOR` | *Lektor* | Future |
| Cantor | `CANTOR` | *Pemazmur* | Future |

### MinistryRole catalog (refines Ministry)

| Role | Code | Ministry | Meaning |
|---|---|---|---|
| Regular | `REGULAR` | USHER | Standard usher assignment |
| Kolekte | `KOLEKTE` | USHER | Offertory collection during Mass |
| Processional | `PROCESSIONAL` | USHER | Offertory procession |
| PPG | `PPG` | USHER | PPG envelope collection (*per-Mass role*, not committee badge) |
| PPKG | `PPKG` | USHER | PPKG charity collection after Mass (*per-Mass role*, not committee badge) |

> **`MinistryRole.PPG` ≠ `Committee.PPG`.**
> The role is "collecting PPG envelopes at this Mass" — per-celebration, set on the `RosterUsher`.
> The committee is "on the building committee" — governance affiliation, set on `CommitteeMembership`.
> The same person may have either, both, or neither. They do not imply each other.

---

## Tier 3 — Affiliations (WHO, governance)

```
Parishioner
 └─ CommitteeMembership   Parishioner × Committee × dateRange
```

### Committee catalog

| Committee | Code | Full name |
|---|---|---|
| Church Building Committee | `PPG` | *Panitia Pembangunan Gereja* |
| Parish Facilities Committee | `PPKG` | *Panitia Pembangunan Komplek Gereja* |
| Parish Pastoral Council | `DPP` | *Dewan Pastoral Paroki* — future |
| Parish Finance Council | `DPK` | *Dewan Keuangan Paroki* — future |

Committee memberships carry `start_date` / `end_date`. Boolean flags cannot express "Pak Budi was PPG until 2024."

---

## Tier 4 — Calendar (deferred)

```
LiturgicalYear → Season → LiturgicalDay
RecurrenceRule  ("1st Friday monthly", "every Sunday")
SpecialObservance  (Ash Wednesday, Palm Sunday, Holy Thursday, Easter Vigil)
```

Names are reserved; implementation is deferred until there is a product need.

---

## Naming Policy

| Layer | Language | Examples |
|---|---|---|
| DB table and column names | English | `parishioner`, `mass_schedule`, `celebration`, `community` |
| TypeScript types | English (Indonesian proper noun where canonical) | `Ministry.EMHC`, `Ministry.PETA`, `MinistryRole.Kolekte` |
| Catalog row `code` (stable identifier) | **Indonesian acronym** | `PPG`, `PPKG`, `DPP`, `DPK` |
| Catalog row `name` (display) | Indonesian (full) | *Panitia Pembangunan Gereja* |
| User-facing UI strings | Indonesian | "Misa", "Wilayah", "Lingkungan", "Prodiakon", "PPG" |
| Comments and ADRs | English (with Indonesian gloss) | "EMHC (*Prodiakon*)" |

### Proper nouns kept in TypeScript

The following Indonesian terms have no precise English equivalent and appear as-is in TypeScript:

- `Wilayah` — canonical Indonesian Catholic territorial unit
- `PETA` — *Pengurus Tata Tertib* — the roster-authoring ministry
- `Kolekte`, `PPG`, `PPKG` — per-Mass collection roles (parish-canonical acronyms)

### The `Community` / `Lingkungan` split

`Community` is the TypeScript interface name (English, for code readability by future non-Indonesian contributors). The UI label is always *Lingkungan* (the Indonesian proper noun displayed to parishioners). The DB table is `community`.

---

## Key Distinctions

### PETA is a Ministry, not a Role

`PETA` (*Pengurus Tata Tertib*) is a separate `Ministry` alongside Usher and EMHC — not a role within Usher. Their primary service is **authoring the Roster** (assigning Community → Celebration). Their secondary service is standing at designated PETA stations during Mass and filling in at empty usher stations when zones are short-staffed.

### Station declares Ministry; RosterUsher declares Role

- `Station.ministryId` → which Ministry serves this physical point (Usher, PETA, EMHC).
- `RosterUsher.ministryRoleId` → which Role the individual holds at this Celebration (Regular, Kolekte, PPG, …).

### Roster lifecycle

```
PETA creates Roster → RosterEntry stubs per Community (status: draft)
Community submits usher names → status: submitted
PETA confirms + runs station distribution → status: confirmed
```

The `RosterEntry` status tracks the Community's commitment to one Celebration. `RosterUsher` rows carry the individual names and roles within that entry.

### Snapshot denormalisation on RosterEntry

`communityName` and `wilayahName` are stored on `RosterEntry` at assignment time. This preserves the display name even if the Community is later renamed or deactivated. It is intentional — not a normalisation oversight.

---

## Entity Relationship Summary

```
Parish ──< Wilayah ──< Community ──< Parishioner
  │
  └──< Church ──< Section ──< Zone ──< Station >── Ministry
                                                        │
Ministry ──< MinistryRole                               │
                   │                                    │
Celebration ──< Roster ──< RosterEntry >── Community   │
                              └──< RosterUsher >── MinistryRole
                                           └──> Station
```

---

## Current Migration Status

All new-domain entities are implemented behind Statsig feature gates. Legacy entities are retained until Phase 8 (sunset).

| Old entity | New entity | Status |
|---|---|---|
| `Mass` / `mass` | `MassSchedule` | `MassSchedule` alias live; DB table unchanged |
| `ChurchEvent` / `event` | `Celebration` | TypeScript still `ChurchEvent`; not renamed |
| `ChurchZoneGroup` / `church_zone_group` | `Section` / `section` | New table exists; old retained |
| `ChurchZone` / `church_zone` | `Zone` / `zone` | New table exists; old retained |
| `ChurchPosition` / `church_position` | `Station` / `station` | New table exists; old retained |
| `EventUsher` / `event_usher` | `RosterUsher` / `roster_usher` | New table exists; old retained |
| `Lingkungan` / `lingkungan` | `Community` / `community` | New table exists; old retained (data migration deferred to Phase 8) |
| `is_ppg` / `is_kolekte` booleans | `MinistryRole.code` | New model uses roles; legacy booleans retained |
| Parish as string on `church` | `Parish` entity | New table seeded; bridge FK on `church`/`wilayah` |
