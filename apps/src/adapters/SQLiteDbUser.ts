import { user } from '$lib/server/db/schema';
import type { User } from '$core/entities/Authentication';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { logger } from '$src/lib/utils/logger';

export async function findUserByEmail(
	db: ReturnType<typeof drizzle>,
	email: string
): Promise<User> {
	const result = await db.select().from(user).where(eq(user.email, email)).limit(1);
	return result[0];
}

export async function findUsersByChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<User[]> {
	const result = await db
		.select()
		.from(user)
		.where(and(eq(user.cid, churchId), eq(user.role, 'admin')));
	return result;
}
