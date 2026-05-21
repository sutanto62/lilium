import { hasRole } from '$src/auth';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { ServiceError } from '$core/errors/ServiceError';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { isNewDomainEligible, featurePreference } = await event.parent();
	if (!isNewDomainEligible || featurePreference !== 'new_domain') {
		throw redirect(302, '/admin/settings/data-posisi');
	}
	throw redirect(302, '/admin/settings/struktur');
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
		const code = (formData.get('code') as string)?.trim() || null;
		const description = (formData.get('description') as string)?.trim() || null;
		const zoneId = (formData.get('zoneId') as string)?.trim();
		const ministryId = (formData.get('ministryId') as string)?.trim();
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama pos wajib diisi' });
		if (!zoneId) return fail(400, { error: 'Zona wajib dipilih' });
		if (!ministryId) return fail(400, { error: 'Pelayanan wajib dipilih' });

		try {
			await repo.createStation({ name, code, description, zoneId, ministryId, defaultRoleId: null, sequence, churchId, active: 1 });

			await Promise.all([
				statsigService.logEvent('admin_station_create', 'create', session, { church_id: churchId }),
				trackServerEvent('admin_station_create', { event_type: 'station_created', church_id: churchId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_station.create: Error', { err });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal membuat pos. Silakan coba lagi.' });
		}
	},

	update: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const stationId = formData.get('stationId') as string;
		if (!stationId) return fail(400, { error: 'ID pos tidak ditemukan' });

		const name = (formData.get('name') as string)?.trim();
		const code = (formData.get('code') as string)?.trim() || null;
		const description = (formData.get('description') as string)?.trim() || null;
		const zoneId = (formData.get('zoneId') as string)?.trim();
		const ministryId = (formData.get('ministryId') as string)?.trim();
		const sequence = formData.get('sequence') ? Number(formData.get('sequence')) : null;

		if (!name) return fail(400, { error: 'Nama pos wajib diisi' });
		if (!zoneId) return fail(400, { error: 'Zona wajib dipilih' });
		if (!ministryId) return fail(400, { error: 'Pelayanan wajib dipilih' });

		try {
			const ok = await repo.updateStation(stationId, { name, code, description, zoneId, ministryId, sequence });
			if (!ok) return fail(404, { error: 'Pos tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_station_update', 'update', session, { station_id: stationId }),
				trackServerEvent('admin_station_update', { event_type: 'station_updated', station_id: stationId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_station.update: Error', { err, stationId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal mengubah pos. Silakan coba lagi.' });
		}
	},

	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session) return fail(401, { error: 'Anda harus login' });
		if (!hasRole(session, 'admin')) return fail(403, { error: 'Tidak ada izin' });

		const formData = await request.formData();
		const stationId = formData.get('stationId') as string;
		if (!stationId) return fail(400, { error: 'ID pos tidak ditemukan' });

		try {
			const ok = await repo.deactivateStation(stationId);
			if (!ok) return fail(404, { error: 'Pos tidak ditemukan' });

			await Promise.all([
				statsigService.logEvent('admin_station_delete', 'delete', session, { station_id: stationId }),
				trackServerEvent('admin_station_delete', { event_type: 'station_deleted', station_id: stationId }, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_station.delete: Error', { err, stationId });
			if (err instanceof ServiceError) return fail(400, { error: err.message });
			return fail(500, { error: 'Gagal menghapus pos. Silakan coba lagi.' });
		}
	}
} satisfies Actions;
