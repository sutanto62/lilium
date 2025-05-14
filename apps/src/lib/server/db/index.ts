import { SQLiteAdapter } from '$adapters/SQLiteAdapter';
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import { logger } from '$src/lib/utils/logger';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

function createDatabase(): ScheduleRepository {
	const databaseUrl = import.meta.env.VITE_DATABASE_URL;
	const authToken = import.meta.env.VITE_DATABASE_AUTH_TOKEN;

	if (!databaseUrl) throw new Error('Database URL variable is not set');

	try {
		// For local SQLite file, use file: prefix
		const url = databaseUrl.startsWith('file:') ? databaseUrl : `file:${databaseUrl}`;

		const client = createClient({
			url,
			authToken: authToken
		});

		const database = drizzle(client);
		logger.info(`database connected`)
		return new SQLiteAdapter(database);
	} catch (err) {
		logger.error(`Failed to open database: ${err}`);
		throw err;
	}
}

export const repo = createDatabase();
