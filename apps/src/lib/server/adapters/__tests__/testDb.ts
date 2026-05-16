/**
 * SQLite test database helper for adapter integration tests.
 *
 * Uses @libsql/client/sqlite3 with a temp file (not :memory:) because
 * the sqlite3 client closes and recreates the DB connection after each
 * transaction, which resets in-memory databases.
 *
 * Each createTestDb() call generates a unique temp file; callers should
 * call cleanupTestDb(path) in afterEach to remove the file.
 */
// @vitest-environment node
import { createClient } from '@libsql/client/sqlite3';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/server/db/schema';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type TestDb = ReturnType<typeof drizzle>;

let tempDir: string | null = null;
let tempCounter = 0;

async function getTempDir(): Promise<string> {
	if (!tempDir) {
		tempDir = await mkdtemp(join(tmpdir(), 'lis-test-'));
	}
	return tempDir;
}

/** Remove the temp directory created by this session. Call once in afterAll. */
export async function cleanupTempDir(): Promise<void> {
	if (tempDir) {
		await rm(tempDir, { recursive: true, force: true });
		tempDir = null;
	}
}

/** Create a fresh SQLite database with the full domain schema. */
export async function createTestDb(): Promise<TestDb> {
	const dir = await getTempDir();
	const dbPath = join(dir, `test-${++tempCounter}.db`);

	const client = createClient({ url: `file:${dbPath}` });
	const db = drizzle(client);

	const ddl: string[] = [
		`CREATE TABLE IF NOT EXISTS parish (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			code TEXT UNIQUE NOT NULL,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS church (
			id TEXT PRIMARY KEY NOT NULL,
			code TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			parish TEXT,
			parish_id TEXT REFERENCES parish(id),
			require_ppg INTEGER NOT NULL DEFAULT 0,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS wilayah (
			id TEXT PRIMARY KEY NOT NULL,
			code TEXT,
			name TEXT NOT NULL,
			sequence INTEGER NOT NULL,
			church_id TEXT REFERENCES church(id),
			parish_id TEXT REFERENCES parish(id),
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER
		)`,
		`CREATE TABLE IF NOT EXISTS community (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			wilayah_id TEXT REFERENCES wilayah(id),
			parish_id TEXT REFERENCES parish(id),
			sequence INTEGER,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS section (
			id TEXT PRIMARY KEY NOT NULL,
			church_id TEXT NOT NULL REFERENCES church(id),
			name TEXT NOT NULL,
			code TEXT,
			description TEXT,
			sequence INTEGER,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS zone (
			id TEXT PRIMARY KEY NOT NULL,
			church_id TEXT NOT NULL REFERENCES church(id),
			section_id TEXT REFERENCES section(id),
			name TEXT NOT NULL,
			code TEXT,
			description TEXT,
			sequence INTEGER,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS ministry (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			code TEXT UNIQUE NOT NULL,
			description TEXT,
			requires_station INTEGER NOT NULL DEFAULT 1,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS ministry_role (
			id TEXT PRIMARY KEY NOT NULL,
			ministry_id TEXT NOT NULL REFERENCES ministry(id),
			name TEXT NOT NULL,
			code TEXT NOT NULL,
			is_special_collection INTEGER NOT NULL DEFAULT 0,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS station (
			id TEXT PRIMARY KEY NOT NULL,
			church_id TEXT NOT NULL REFERENCES church(id),
			zone_id TEXT NOT NULL REFERENCES zone(id),
			ministry_id TEXT NOT NULL REFERENCES ministry(id),
			default_role_id TEXT REFERENCES ministry_role(id),
			name TEXT NOT NULL,
			code TEXT,
			description TEXT,
			sequence INTEGER,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS "user" (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			email TEXT UNIQUE NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			cid TEXT NOT NULL DEFAULT '1',
			lingkungan_id TEXT,
			feature_preference TEXT,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS mass (
			id TEXT PRIMARY KEY NOT NULL,
			code TEXT,
			name TEXT NOT NULL,
			sequence INTEGER,
			church_id TEXT REFERENCES church(id),
			day TEXT NOT NULL DEFAULT 'sunday',
			time TEXT,
			briefing_time TEXT,
			active INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER
		)`,
		`CREATE TABLE IF NOT EXISTS event (
			id TEXT PRIMARY KEY NOT NULL,
			church_id TEXT NOT NULL REFERENCES church(id),
			mass_id TEXT NOT NULL REFERENCES mass(id),
			date TEXT NOT NULL,
			week_number INTEGER,
			created_at INTEGER DEFAULT (unixepoch()),
			is_complete INTEGER NOT NULL DEFAULT 0,
			active INTEGER NOT NULL DEFAULT 1,
			type TEXT NOT NULL DEFAULT 'mass',
			code TEXT,
			description TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS roster (
			id TEXT PRIMARY KEY NOT NULL,
			event_id TEXT NOT NULL REFERENCES event(id),
			created_by_user_id TEXT NOT NULL REFERENCES "user"(id),
			version INTEGER NOT NULL DEFAULT 1,
			status TEXT NOT NULL DEFAULT 'draft',
			created_at INTEGER DEFAULT (unixepoch()),
			updated_at INTEGER DEFAULT (unixepoch())
		)`,
		`CREATE TABLE IF NOT EXISTS roster_entry (
			id TEXT PRIMARY KEY NOT NULL,
			roster_id TEXT NOT NULL REFERENCES roster(id),
			community_id TEXT NOT NULL REFERENCES community(id),
			community_name TEXT NOT NULL,
			wilayah_id TEXT NOT NULL REFERENCES wilayah(id),
			wilayah_name TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			submitted_at INTEGER,
			confirmed_at INTEGER,
			confirmed_by_user_id TEXT REFERENCES "user"(id)
		)`,
		`CREATE TABLE IF NOT EXISTS roster_usher (
			id TEXT PRIMARY KEY NOT NULL,
			roster_entry_id TEXT NOT NULL REFERENCES roster_entry(id),
			name TEXT NOT NULL,
			ministry_role_id TEXT NOT NULL REFERENCES ministry_role(id),
			station_id TEXT REFERENCES station(id),
			sequence INTEGER,
			created_at INTEGER DEFAULT (unixepoch())
		)`
	];

	for (const stmt of ddl) {
		await client.execute(stmt);
	}

	return db;
}

/** Seed the ministry catalog (matches production migration 0002 seed data). */
export async function seedMinistries(db: TestDb): Promise<void> {
	await db.insert(schema.ministry).values([
		{ id: 'min-usher', name: 'Penerima Tamu', code: 'USHER', description: null, requiresStation: 1, active: 1 },
		{ id: 'min-prodiakon', name: 'Prodiakon', code: 'PRODIAKON', description: null, requiresStation: 1, active: 1 },
		{ id: 'min-peta', name: 'PETA', code: 'PETA', description: null, requiresStation: 0, active: 1 },
		{ id: 'min-emhc', name: 'EMHC', code: 'EMHC', description: null, requiresStation: 1, active: 1 }
	]);

	await db.insert(schema.ministry_role).values([
		{ id: 'role-regular', ministryId: 'min-usher', name: 'Regular', code: 'REGULAR', isSpecialCollection: 0, active: 1 },
		{ id: 'role-kolekte', ministryId: 'min-usher', name: 'Kolekte', code: 'KOLEKTE', isSpecialCollection: 1, active: 1 },
		{ id: 'role-ppg', ministryId: 'min-usher', name: 'PPG', code: 'PPG', isSpecialCollection: 1, active: 1 },
		{ id: 'role-ppkg', ministryId: 'min-usher', name: 'PPKG', code: 'PPKG', isSpecialCollection: 1, active: 1 }
	]);
}

/** Seed a parish + church for territorial/facility tests. */
export async function seedParishAndChurch(
	db: TestDb
): Promise<{ parishId: string; churchId: string }> {
	await db.insert(schema.parish).values({
		id: 'test-parish-1',
		name: 'Test Parish',
		code: 'TEST',
		active: 1
	});

	await db.insert(schema.church).values({
		id: 'test-church-1',
		code: 'CHURCH1',
		name: 'Test Church',
		parish: null,
		parishId: 'test-parish-1',
		requirePpg: 0,
		active: 1
	});

	return { parishId: 'test-parish-1', churchId: 'test-church-1' };
}
