import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv';
dotenv.config();
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import { SQLiteAdapter } from '$adapters/SQLiteAdapter';

function createDatabase(): ScheduleRepository {
	const databaseUrl = import.meta.env.VITE_DATABASE_URL;
	if (!databaseUrl) throw new Error('Database URL variableß is not set');

	let database: ReturnType<typeof drizzle>;

	if (
		databaseUrl.startsWith('/') ||
		databaseUrl.startsWith('../') ||
		databaseUrl.startsWith('file:')
	) {
		const sqlite = new Database(databaseUrl);
		database = drizzle(sqlite);
		return new SQLiteAdapter(database);
	} else if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
		throw new Error('Postgres is not supported yet');
	} else {
		throw new Error('Unsupported database type or invalid database URL');
	}
}

export const repo = createDatabase();
