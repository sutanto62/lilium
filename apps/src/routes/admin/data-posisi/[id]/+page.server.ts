import { hasRole } from '$src/auth';
import { PositionService, type CreatePositionInput } from '$core/service/PositionService';
import { ServiceError } from '$core/errors/ServiceError';
import { statsigService } from '$src/lib/application/StatsigService';
import { posthogService } from '$src/lib/application/PostHogService';
import { repo } from '$src/lib/server/db';
import { logger } from '$src/lib/utils/logger';
import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Church, MassPositionView } from '$core/entities/Schedule';
import { shouldRequirePpg } from '$lib/utils/ppgUtils';

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	await statsigService.use();

	const session = await event.locals.auth();
	if (!session) {
		logger.warn('admin_posisi_detail.load: No session found');
		throw redirect(302, '/signin');
	}

	if (!hasRole(session, 'admin')) {
		logger.warn('admin_posisi_detail.load: User does not have admin role');
		throw redirect(302, '/');
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		logger.error('admin_posisi_detail.load: Church ID not found in session');
		throw error(500, 'Invalid session data');
	}

	let church: Church | null = null;
	church = await repo.findChurchById(churchId);
	if (!church) {
		throw error(404, 'Gereja belum terdaftar');
	}

	// Check if PPG is required for this church
	const requirePpg = await shouldRequirePpg(church);

	const massId = event.params.id;
	if (!massId) {
		logger.error('admin_posisi_detail.load: Mass ID not found in params');
		throw error(400, 'ID misa tidak ditemukan');
	}

	try {
		// Fetch mass details, positions, and zones concurrently
		const [mass, positionsByMass, zonesByMass] = await Promise.all([
			repo.getMassById(massId),
			new PositionService(churchId).retrievePositionsByMass(massId),
			repo.getZonesByMass(churchId, massId)
		]);

		if (!mass) {
			logger.warn('admin_posisi_detail.load: Mass not found', { massId });
			throw error(404, 'Misa tidak ditemukan');
		}

		if (mass.church !== churchId) {
			logger.warn('admin_posisi_detail.load: Mass does not belong to church', { massId, churchId });
			throw error(403, 'Anda tidak memiliki akses untuk melihat posisi misa ini');
		}

		const metadata = {
			mass_id: massId,
			total_positions: positionsByMass.length,
			load_time_ms: Date.now() - startTime
		};

		await Promise.all([
			statsigService.logEvent('admin_posisi_detail_view', 'load', session, {
				...metadata,
				ppg_enabled: requirePpg
			}),
			posthogService.trackEvent('admin_posisi_detail_view', {
				event_type: 'page_load',
				...metadata,
				ppg_enabled: requirePpg
			}, session)
		]);

		return {
			mass,
			positionsByMass,
			zonesByMass,
			requirePpg
		};
	} catch (err) {
		logger.error('admin_posisi_detail.load: Error loading positions', { error: err, massId });
		if (err instanceof Error && (err as any).status) {
			throw err;
		}
		throw error(500, 'Gagal memuat data posisi. Silakan coba lagi atau hubungi administrator.');
	}
};

export const actions = {
	create_position: async ({ request, params, locals }) => {
		logger.info('admin_posisi_detail.create_position: Starting position creation', {
			massId: params.id
		});

		const session = await locals.auth();
		if (!session) {
			logger.warn('admin_posisi_detail.create_position: No session found');
			return fail(401, { error: 'Anda harus login untuk mengelola posisi' });
		}

		if (!hasRole(session, 'admin')) {
			logger.warn('admin_posisi_detail.create_position: User does not have admin role');
			return fail(403, { error: 'Anda tidak memiliki izin untuk mengelola posisi' });
		}

		const churchId = session.user?.cid;
		if (!churchId) {
			logger.error('admin_posisi_detail.create_position: Church ID not found in session');
			return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
		}

		let church: Church | null = null;
		church = await repo.findChurchById(churchId);
		if (!church) {
			throw error(404, 'Gereja belum terdaftar');
		}

		const massId = params.id;
		if (!massId) {
			logger.error('admin_posisi_detail.create_position: Mass ID not found in params');
			return fail(400, { error: 'ID misa tidak ditemukan' });
		}

		const formData = await request.formData();
		const zoneId = formData.get('zoneId') as string;
		const name = formData.get('name') as string;
		const type = formData.get('type') as 'usher' | 'prodiakon' | 'peta' | null;
		const code = formData.get('code') as string | null;
		const description = formData.get('description') as string | null;
		const isPpgRequested = formData.get('isPpg') === 'true';
		const sequenceStr = formData.get('sequence') as string | null;

		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Nama posisi wajib diisi' });
		}

		if (!type) {
			return fail(400, { error: 'Tipe posisi wajib diisi' });
		}

		if (!zoneId) {
			return fail(400, { error: 'Zona wajib dipilih' });
		}

		if (type !== 'usher' && type !== 'prodiakon' && type !== 'peta') {
			return fail(400, { error: 'Tipe posisi tidak valid' });
		}

		try {
			const positionService = new PositionService(churchId);
			const ppgEnabled = church.requirePpg === 1;
			const input: CreatePositionInput = {
				name: name.trim(),
				type,
				code: code?.trim() || null,
				description: description?.trim() || null,
				// Only allow PPG positions when the feature is enabled for this church (DB config)
				isPpg: ppgEnabled ? isPpgRequested : false,
				sequence: sequenceStr ? parseInt(sequenceStr, 10) : null
			};

			await positionService.createPositionForMass(massId, zoneId, input);

			logger.info('admin_posisi_detail.create_position: Successfully created position', {
				massId,
				zoneId,
				name
			});

			await Promise.all([
				statsigService.logEvent('admin_posisi_detail_create', 'create', session, {
					mass_id: massId,
					zone_id: zoneId,
					position_name: name,
					position_type: type
				}),
				posthogService.trackEvent('admin_posisi_detail_create', {
					event_type: 'position_created',
					mass_id: massId,
					zone_id: zoneId,
					position_name: name,
					position_type: type
				}, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_posisi_detail.create_position: Error creating position', {
				error: err,
				massId,
				zoneId
			});

			if (err instanceof ServiceError) {
				return fail(400, { error: err.message });
			}

			return fail(500, {
				error: 'Gagal membuat posisi. Silakan coba lagi atau hubungi administrator.'
			});
		}
	},

	edit_position: async ({ request, params, locals }) => {
		logger.info('admin_posisi_detail.edit_position: Starting position update');

		const session = await locals.auth();
		if (!session) {
			logger.warn('admin_posisi_detail.edit_position: No session found');
			return fail(401, { error: 'Anda harus login untuk mengelola posisi' });
		}

		if (!hasRole(session, 'admin')) {
			logger.warn('admin_posisi_detail.edit_position: User does not have admin role');
			return fail(403, { error: 'Anda tidak memiliki izin untuk mengelola posisi' });
		}

		const churchId = session.user?.cid;
		if (!churchId) {
			logger.error('admin_posisi_detail.edit_position: Church ID not found in session');
			return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
		}

		let church: Church | null = null;
		church = await repo.findChurchById(churchId);
		if (!church) {
			throw error(404, 'Gereja belum terdaftar');
		}

		const formData = await request.formData();
		const positionId = formData.get('positionId') as string;

		if (!positionId) {
			return fail(400, { error: 'ID posisi tidak ditemukan' });
		}

		const name = formData.get('name') as string | null;
		const code = formData.get('code') as string | null;
		const description = formData.get('description') as string | null;
		const type = formData.get('type') as 'usher' | 'prodiakon' | 'peta' | null;
		const isPpgRequested = formData.get('isPpg') === 'true';
		const sequenceStr = formData.get('sequence') as string | null;
		const zoneId = formData.get('zoneId') as string | null;

		const patch: {
			name?: string;
			code?: string | null;
			description?: string | null;
			type?: 'usher' | 'prodiakon' | 'peta';
			isPpg?: boolean;
			sequence?: number | null;
			zone?: string;
		} = {};

		if (name !== null) {
			patch.name = name.trim();
		}
		if (code !== null) {
			patch.code = code.trim() || null;
		}
		if (description !== null) {
			patch.description = description.trim() || null;
		}
		if (type !== null && (type === 'usher' || type === 'prodiakon' || type === 'peta')) {
			patch.type = type;
		}
		if (sequenceStr !== null) {
			if (sequenceStr.trim() === '') {
				patch.sequence = null;
			} else {
				const sequence = parseInt(sequenceStr, 10);
				if (!isNaN(sequence) && sequence > 0) {
					patch.sequence = sequence;
				}
			}
		}
		if (zoneId !== null && zoneId.trim() !== '') {
			patch.zone = zoneId.trim();
		}

		if (Object.keys(patch).length === 0) {
			return fail(400, { error: 'Tidak ada perubahan posisi' });
		}

		try {
			const ppgEnabled = church.requirePpg === 1;
			// Only allow PPG updates when feature is enabled for this church (DB config)
			if (ppgEnabled) {
				patch.isPpg = isPpgRequested;
			}

			const positionService = new PositionService(churchId);
			await positionService.editPosition(positionId, patch);

			logger.info('admin_posisi_detail.edit_position: Successfully updated position', {
				positionId
			});

			await Promise.all([
				statsigService.logEvent('admin_posisi_detail_edit', 'update', session, {
					position_id: positionId
				}),
				posthogService.trackEvent('admin_posisi_detail_edit', {
					event_type: 'position_updated',
					position_id: positionId
				}, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_posisi_detail.edit_position: Error updating position', {
				error: err,
				positionId
			});

			if (err instanceof ServiceError) {
				return fail(400, { error: err.message });
			}

			return fail(500, {
				error: 'Gagal memperbarui posisi. Silakan coba lagi atau hubungi administrator.'
			});
		}
	},

	delete_position: async ({ request, params, locals }) => {
		logger.info('admin_posisi_detail.delete_position: Starting position deactivation');

		const session = await locals.auth();
		if (!session) {
			logger.warn('admin_posisi_detail.delete_position: No session found');
			return fail(401, { error: 'Anda harus login untuk mengelola posisi' });
		}

		if (!hasRole(session, 'admin')) {
			logger.warn('admin_posisi_detail.delete_position: User does not have admin role');
			return fail(403, { error: 'Anda tidak memiliki izin untuk mengelola posisi' });
		}

		const churchId = session.user?.cid;
		if (!churchId) {
			logger.error('admin_posisi_detail.delete_position: Church ID not found in session');
			return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
		}

		const formData = await request.formData();
		const positionId = formData.get('positionId') as string;

		if (!positionId) {
			return fail(400, { error: 'ID posisi tidak ditemukan' });
		}

		try {
			const positionService = new PositionService(churchId);
			await positionService.deactivatePosition(positionId);

			logger.info('admin_posisi_detail.delete_position: Successfully deactivated position', {
				positionId
			});

			await Promise.all([
				statsigService.logEvent('admin_posisi_detail_delete', 'delete', session, {
					position_id: positionId
				}),
				posthogService.trackEvent('admin_posisi_detail_delete', {
					event_type: 'position_deleted',
					position_id: positionId
				}, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_posisi_detail.delete_position: Error deactivating position', {
				error: err,
				positionId
			});

			if (err instanceof ServiceError) {
				return fail(400, { error: err.message });
			}

			return fail(500, {
				error: 'Gagal menonaktifkan posisi. Silakan coba lagi atau hubungi administrator.'
			});
		}
	},

	reorder_positions: async ({ request, params, locals }) => {
		logger.info('admin_posisi_detail.reorder_positions: Starting position reorder');

		const session = await locals.auth();
		if (!session) {
			logger.warn('admin_posisi_detail.reorder_positions: No session found');
			return fail(401, { error: 'Anda harus login untuk mengelola posisi' });
		}

		if (!hasRole(session, 'admin')) {
			logger.warn('admin_posisi_detail.reorder_positions: User does not have admin role');
			return fail(403, { error: 'Anda tidak memiliki izin untuk mengelola posisi' });
		}

		const churchId = session.user?.cid;
		if (!churchId) {
			logger.error('admin_posisi_detail.reorder_positions: Church ID not found in session');
			return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
		}

		const formData = await request.formData();
		const zoneId = formData.get('zoneId') as string;
		const itemsStr = formData.get('items') as string | null;

		if (!zoneId) {
			return fail(400, { error: 'ID zona tidak ditemukan' });
		}

		if (!itemsStr) {
			return fail(400, { error: 'Daftar urutan posisi tidak boleh kosong' });
		}

		let items: { id: string; sequence: number }[];
		try {
			items = JSON.parse(itemsStr);
		} catch (err) {
			return fail(400, { error: 'Format daftar urutan posisi tidak valid' });
		}

		if (!Array.isArray(items) || items.length === 0) {
			return fail(400, { error: 'Daftar urutan posisi tidak boleh kosong' });
		}

		// Validate items structure
		for (const item of items) {
			if (!item.id || typeof item.sequence !== 'number') {
				return fail(400, { error: 'Format daftar urutan posisi tidak valid' });
			}
		}

		try {
			const positionService = new PositionService(churchId);
			await positionService.reorderZonePositions(zoneId, items);

			logger.info('admin_posisi_detail.reorder_positions: Successfully reordered positions', {
				zoneId,
				itemCount: items.length
			});

			await Promise.all([
				statsigService.logEvent('admin_posisi_detail_reorder', 'reorder', session, {
					zone_id: zoneId,
					item_count: items.length
				}),
				posthogService.trackEvent('admin_posisi_detail_reorder', {
					event_type: 'positions_reordered',
					zone_id: zoneId,
					item_count: items.length
				}, session)
			]);

			return { success: true };
		} catch (err) {
			logger.error('admin_posisi_detail.reorder_positions: Error reordering positions', {
				error: err,
				zoneId
			});

			if (err instanceof ServiceError) {
				return fail(400, { error: err.message });
			}

			return fail(500, {
				error: 'Gagal mengubah urutan posisi. Silakan coba lagi atau hubungi administrator.'
			});
		}
	}
} satisfies Actions;
