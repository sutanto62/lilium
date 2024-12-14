import type { User } from '$core/entities/Authentication'
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';

export async function findUserByEmail(
	db: ReturnType<typeof drizzle>,
	email: string
): Promise<User> {
	const result = await db.select().from(user).where(eq(user.email, email)).limit(1);
	return result[0];
}
