# Drizzle ORM Migration Baseline Setup

## Overview

Successfully created a Drizzle ORM migration baseline for the Lilium database by introspecting the existing SQLite schema and entities.

## What Was Accomplished

### 1. Database Schema Analysis

- Analyzed the existing `lilium.db` SQLite database structure
- Compared with existing TypeScript entities in `src/core/entities/`
- Identified discrepancies between actual database and current Drizzle schema

### 2. Schema Updates

- Updated `src/lib/server/db/schema.ts` to match the actual database structure
- Fixed field names and constraints to align with the database
- Removed duplicate fields and corrected foreign key references

### 3. Migration Infrastructure

- Created `drizzle/` directory for migration files
- Updated `drizzle.config.ts` to include migrations output directory
- Generated baseline migration: `0000_loose_cardiac.sql`

### 4. Type Safety

- Created `src/lib/server/db/types.ts` with proper TypeScript types
- Provides `InferSelectModel` and `InferInsertModel` types for all tables
- Ensures type safety when working with database operations

### 5. Migration Tools

- Created `scripts/migrate.ts` for programmatic migration execution
- Added `db:migrate:custom` script to package.json
- Created comprehensive documentation in `drizzle/README.md`

## Database Tables

The migration baseline includes 11 tables:

1. **user** - User accounts and authentication
2. **church** - Church information
3. **church_zone** - Church zones/areas
4. **church_position** - Positions within church zones
5. **mass** - Mass schedules
6. **mass_zone** - Zone assignments for masses
7. **wilayah** - Regional areas
8. **lingkungan** - Community areas
9. **event** - Church events
10. **event_usher** - Usher assignments for events
11. **event_zone_pic** - Zone PIC assignments for events

## Usage

### Generate new migrations

```bash
npm run db:generate
```

### Apply migrations using Drizzle Kit

```bash
npm run db:migrate
```

### Apply migrations using custom script

```bash
npm run db:migrate:custom
```

### View database in Drizzle Studio

```bash
npm run db:studio
```

---

## Safe Migration Script (`scripts/migrate-safe.sh`)

Use this script when applying pending migrations to a live or staging database. It backs up the database before touching it, runs Drizzle's migration, then verifies that all expected tables, columns, and seed rows are present.

### What it does

1. **Backup** — copies `db/lilium.db` to `db/backups/lilium_pre_migration_<timestamp>.db` before any changes.
2. **Migrate** — runs `npm run db:migrate` (Drizzle Kit).
3. **Verify** — checks that all 10 new domain tables exist, 4 new columns are present, and seed rows are correct (1 parish, 5 ministries, 5 ministry roles).
4. **Exits non-zero** if any check fails, so CI or a manual operator can catch partial failures.

### Usage

```bash
# From the apps/ directory
bash scripts/migrate-safe.sh            # full run: backup → migrate → verify
bash scripts/migrate-safe.sh --dry-run  # preview only: shows current DB state, no changes
```

### What gets migrated

| Migration | What it adds |
|---|---|
| `0001` | `user.feature_preference` column |
| `0002` | New domain tables: `parish`, `community`, `section`, `zone`, `ministry`, `ministry_role`, `station`, `roster`, `roster_entry`, `roster_usher`; `church.parish_id`, `wilayah.parish_id` columns; seed data for parish, ministries, and ministry roles |
| `0003` | Skipped — its journal timestamp predates migration 0000's corrected timestamp; see Known Issues below |
| `0004` | Backfills `church.parish_id = 'parish-1'` for all existing church rows |
| `0005` | `roster_entry.confirmed_by_user_id` column (handles what 0003 was supposed to add) |

### Restoring from backup

If the migration fails mid-way:

```bash
# Replace <timestamp> with the value printed at the start of the run
cp db/backups/lilium_pre_migration_<timestamp>.db db/lilium.db
```

### Known issues and fixes applied

#### `__drizzle_migrations` timestamp mismatch (fixed)

**Symptom:** `npm run db:migrate` fails with `LibsqlError: SQLITE_OK: not an error`.

**Root cause:** The `created_at` stored in `__drizzle_migrations` for migration 0000 was `1735469290126` (the original DB setup date), but the journal was later updated to set 0000's `when` to `1769133298583`. Drizzle compares these values to decide which migrations to apply: since `1735469290126 < 1769133298583`, it tried to re-run 0000 — whose file is a pure SQL comment. libsql's native binding throws `SQLITE_OK` when executing a comment-only batch, surfacing as a misleading error.

**Fix applied:** Updated `__drizzle_migrations` directly:
```sql
UPDATE __drizzle_migrations
SET created_at = 1769133298583
WHERE created_at = 1735469290126;
```
This aligns the stored timestamp with the journal, so Drizzle correctly skips 0000 on subsequent runs.

#### Migration 0003 skipped by design

**Symptom:** `roster_entry.confirmed_by_user_id` is not added by migration 0003.

**Root cause:** 0003's journal `when` (`1747386600000`) is earlier than 0000's corrected timestamp (`1769133298583`). Drizzle's migrator skips any migration whose `folderMillis` is not greater than the last applied `created_at`, so 0003 is never applied.

**Fix applied:** Migration 0005 was updated to add `confirmed_by_user_id` instead. 0003 remains in the folder but is permanently skipped — do not remove it, as removing migration files breaks Drizzle's journal integrity.

## Environment Setup

Ensure the following environment variable is set:

```bash
VITE_DATABASE_URL="file:./db/lilium.db"
```

## Next Steps

1. **Apply the baseline migration** to ensure the database schema is properly tracked
2. **Update existing code** to use the new TypeScript types from `src/lib/server/db/types.ts`
3. **Test the migration system** by making schema changes and generating new migrations
4. **Consider migrating to Svelte 5** as per workspace rules for better performance and features

## Files Created/Modified

- ✅ `src/lib/server/db/schema.ts` - Updated to match actual database
- ✅ `src/lib/server/db/types.ts` - New TypeScript types
- ✅ `drizzle/0000_loose_cardiac.sql` - Baseline migration
- ✅ `drizzle/meta/_journal.json` - Migration tracking
- ✅ `drizzle/README.md` - Documentation
- ✅ `scripts/migrate.ts` - Custom migration script
- ✅ `drizzle.config.ts` - Updated configuration
- ✅ `package.json` - Added migration scripts
- ✅ `MIGRATION_BASELINE.md` - This summary document
