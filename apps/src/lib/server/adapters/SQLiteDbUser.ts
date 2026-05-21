import type { User } from '$core/entities/Authentication';
import { user } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
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

export async function updateUserFeaturePreference(
	db: ReturnType<typeof drizzle>,
	email: string,
	preference: string | null
): Promise<void> {
	await db
		.update(user)
		.set({ featurePreference: preference })
		.where(eq(user.email, email));
}

export async function listAllUsersByChurch(
	db: ReturnType<typeof drizzle>,
	churchId: string
): Promise<(typeof user.$inferSelect)[]> {
	const result = await db.select().from(user).where(eq(user.cid, churchId)).orderBy(user.name);
	logger.debug('listAllUsersByChurch: Retrieved rows', { churchId, count: result.length, rows: result });
	return result;
}

export async function createUser(
	db: ReturnType<typeof drizzle>,
	data: { id: string; name: string; email: string; role: 'admin' | 'user'; cid: string; active: number }
): Promise<void> {
	await db.insert(user).values(data);
}

export async function updateUser(
	db: ReturnType<typeof drizzle>,
	userId: string,
	data: Partial<{ role: 'admin' | 'user'; lingkunganId: string | null; active: number }>
): Promise<void> {
	await db.update(user).set(data).where(eq(user.id, userId));
}
