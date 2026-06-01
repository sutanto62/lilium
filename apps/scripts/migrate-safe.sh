#!/usr/bin/env bash
# Safe migration: old schema → new domain model (migrations 0001–0005)
# Backs up the database, runs pending Drizzle migrations, then verifies the result.
#
# Usage:  bash scripts/migrate-safe.sh [--dry-run]
#
# What this migrates:
#   0001  user.feature_preference column
#   0002  New domain tables: parish, community, section, zone, ministry,
#         ministry_role, station, roster, roster_entry, roster_usher
#         + church.parish_id, wilayah.parish_id columns
#         + seed data: parish row, ministry catalog, ministry roles
#   0003  roster_entry.confirmed_by_user_id column
#   0004  Backfill church.parish_id → 'parish-1'
#   0005  No-op (duplicate resolved in file)

set -euo pipefail

DB="db/lilium.db"
BACKUP_DIR="db/backups"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

# ── Preflight ─────────────────────────────────────────────────────────────────

if [[ ! -f "$DB" ]]; then
  echo "ERROR: Database not found at $DB" >&2
  exit 1
fi

# ── Backup ────────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP="$BACKUP_DIR/lilium_pre_migration_$STAMP.db"

echo "→ Backing up $DB to $BACKUP"
cp "$DB" "$BACKUP"

# ── Pre-migration state ───────────────────────────────────────────────────────

echo ""
echo "→ Pre-migration table list:"
sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""
echo "→ Applied Drizzle migrations:"
sqlite3 "$DB" "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at;"

# ── Dry-run gate ──────────────────────────────────────────────────────────────

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "DRY RUN — no changes applied. Remove --dry-run to execute."
  exit 0
fi

# ── Fix: align __drizzle_migrations timestamp with journal ────────────────────
#
# Migration 0000's journal `when` was retroactively updated to 1769133298583,
# but the DB still stores the original setup timestamp (1735469290126).
# Drizzle compares these to decide which migrations to apply; the mismatch
# causes it to re-run 0000 (a pure comment file), triggering a libsql bug.
# This UPDATE is idempotent — it only fires when the stale value is present.

echo ""
echo "→ Fixing migration 0000 timestamp (if stale)..."
STALE_TS=1735469290126
CORRECT_TS=1769133298583
CURRENT_TS=$(sqlite3 "$DB" "SELECT created_at FROM __drizzle_migrations WHERE created_at = $STALE_TS;" 2>/dev/null || echo "")
if [[ "$CURRENT_TS" == "$STALE_TS" ]]; then
  sqlite3 "$DB" "UPDATE __drizzle_migrations SET created_at = $CORRECT_TS WHERE created_at = $STALE_TS;"
  echo "  Fixed: $STALE_TS → $CORRECT_TS"
else
  echo "  OK (already correct)"
fi

# ── Apply migrations ──────────────────────────────────────────────────────────

echo ""
echo "→ Running: npm run db:migrate"
npm run db:migrate

# ── Verify: required tables ───────────────────────────────────────────────────

echo ""
echo "→ Verifying new domain tables..."

REQUIRED_TABLES=(
  parish community
  ministry ministry_role
  section zone station
  roster roster_entry roster_usher
)

ALL_OK=true
for table in "${REQUIRED_TABLES[@]}"; do
  EXISTS=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='$table';")
  if [[ "$EXISTS" -eq 1 ]]; then
    echo "  ✓ $table"
  else
    echo "  ✗ MISSING: $table"
    ALL_OK=false
  fi
done

# ── Verify: required columns ──────────────────────────────────────────────────

echo ""
echo "→ Verifying new columns..."

check_column() {
  local table=$1 col=$2
  local exists
  exists=$(sqlite3 "$DB" "SELECT COUNT(*) FROM pragma_table_info('$table') WHERE name='$col';")
  if [[ "$exists" -eq 1 ]]; then
    echo "  ✓ $table.$col"
  else
    echo "  ✗ MISSING: $table.$col"
    ALL_OK=false
  fi
}

check_column church parish_id
check_column wilayah parish_id
check_column user feature_preference
check_column roster_entry confirmed_by_user_id

# ── Verify: seed data ─────────────────────────────────────────────────────────

echo ""
echo "→ Verifying seed data..."

PARISH_COUNT=$(sqlite3 "$DB" "SELECT COUNT(*) FROM parish;" 2>/dev/null || echo 0)
MINISTRY_COUNT=$(sqlite3 "$DB" "SELECT COUNT(*) FROM ministry;" 2>/dev/null || echo 0)
ROLE_COUNT=$(sqlite3 "$DB" "SELECT COUNT(*) FROM ministry_role;" 2>/dev/null || echo 0)

echo "  parish rows:       $PARISH_COUNT (expect 1)"
echo "  ministry rows:     $MINISTRY_COUNT (expect 5)"
echo "  ministry_role rows: $ROLE_COUNT (expect 5)"

[[ "$PARISH_COUNT" -ge 1 ]] || ALL_OK=false
[[ "$MINISTRY_COUNT" -ge 5 ]] || ALL_OK=false
[[ "$ROLE_COUNT" -ge 5 ]]    || ALL_OK=false

# ── Result ────────────────────────────────────────────────────────────────────

echo ""
if [[ "$ALL_OK" == "true" ]]; then
  echo "✓ Migration complete. Backup: $BACKUP"
else
  echo "✗ Migration completed with errors. Restore from backup:"
  echo "    cp $BACKUP $DB"
  exit 1
fi
