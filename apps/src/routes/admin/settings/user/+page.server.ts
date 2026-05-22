import { hasRole } from '$src/auth';
import type { Community } from '$core/entities/Parish';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	const { isNewUX, featurePreference } = await event.parent();
	if (!isNewUX || featurePreference !== 'new_domain') {
		throw redirect(302, '/admin/settings');
	}

	const { session } = await handlePageLoad(event, 'user');
	if (!session) {
		logger.warn('admin_user.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_user.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_user.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	let users: Awaited<ReturnType<typeof repo.listAllUsersByChurch>> = [];
	let lingkunganOptions: Community[] = [];

	try {
		const parishId = await repo.getParishIdByChurch(churchId);
		[users, lingkunganOptions] = await Promise.all([
			repo.listAllUsersByChurch(churchId),
			repo.listCommunities(parishId)
		]);
	} catch (err) {
		logger.error('admin_user.load: Error fetching data', { err, churchId });
		throw error(500, 'Failed to fetch user data');
	}

	const metadata = {
		total_users: users.length,
		load_time_ms: Date.now() - startTime
	};

	await Promise.all([
		statsigService.logEvent('admin_user_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_user_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return { users, lingkunganOptions, churchId };
};

export const actions = {
	create: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const churchId = session.user?.cid;
		if (!churchId) return fail(404, { error: 'Tidak ada gereja yang terdaftar' });

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const role = (formData.get('role') as 'admin' | 'user') || 'user';

		if (!name) return fail(400, { error: 'Nama pengguna wajib diisi' });
		if (!email) return fail(400, { error: 'Email wajib diisi' });
		if (!['admin', 'user'].includes(role)) return fail(400, { error: 'Peran tidak valid' });

		try {
			const id = crypto.randomUUID();
			await repo.createUser({ id, name, email, role, cid: churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_user_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_user_create', { event_type: 'user_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_user.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menambahkan pengguna. Email mungkin sudah terdaftar.' });
		}
	},

	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		if (!userId) return fail(400, { error: 'ID pengguna tidak ditemukan' });

		const role = formData.get('role') as 'admin' | 'user';
		const lingkunganId = (formData.get('lingkunganId') as string) || null;

		if (!['admin', 'user'].includes(role)) return fail(400, { error: 'Peran tidak valid' });

		try {
			await repo.updateUser(userId, { role, lingkunganId });

			await Promise.all([
				statsigService.logEvent('admin_user_update', 'update', session, { user_id: userId }),
				trackServerEvent('admin_user_update', { event_type: 'user_updated', user_id: userId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_user.update: Error', { err, userId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah pengguna. Silakan coba lagi.' });
		}
	},

	deactivate: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		if (!userId) return fail(400, { error: 'ID pengguna tidak ditemukan' });

		try {
			await repo.updateUser(userId, { active: 0 });

			await Promise.all([
				statsigService.logEvent('admin_user_deactivate', 'deactivate', session, { user_id: userId }),
				trackServerEvent('admin_user_deactivate', { event_type: 'user_deactivated', user_id: userId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_user.deactivate: Error', { err, userId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menonaktifkan pengguna. Silakan coba lagi.' });
		}
	},

	reactivate: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		if (!userId) return fail(400, { error: 'ID pengguna tidak ditemukan' });

		try {
			await repo.updateUser(userId, { active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_user_reactivate', 'reactivate', session, { user_id: userId }),
				trackServerEvent('admin_user_reactivate', { event_type: 'user_reactivated', user_id: userId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_user.reactivate: Error', { err, userId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengaktifkan pengguna. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
