import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

// Services
import { ServiceError, ServiceErrorType } from '$core/errors/ServiceError';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { RosterService } from '$core/service/RosterService';
import { hasRole } from '$src/auth';
import { trackServerEvent } from '$src/lib/server/posthogNode';
import { statsigService } from '$src/lib/application/StatsigService';
import { checkServerGate } from '$lib/server/featureFlags';
import { repo } from '$lib/server/db';

async function getAuthContext(event: RequestEvent): Promise<{
	churchId: string;
	session: Awaited<ReturnType<typeof event.locals.auth>>;
}> {
	const session = await event.locals.auth();
	const churchId = session?.user?.cid ?? '';
	if (!churchId) {
		logger.error('Church not found');
		throw error(404, 'Gereja belum terdaftar');
	}
	return { churchId, session };
}

export const load: PageServerLoad = async (event) => {
	const startTime = Date.now();

	const { session } = await handlePageLoad(event, 'jadwal_detail');

	if (!session) {
		throw redirect(302, '/signin');
	}

	const churchId = session.user?.cid ?? '';
	const eventId = event.params.id;

	// ── Gate check: new roster flow ────────────────────────────────────────────
	const isNewRosterFlow = await checkServerGate(event.locals, 'new_roster_flow');
	logger.debug('admin_jadwal_detail.load: gate check', { eventId, isNewRosterFlow });

	if (isNewRosterFlow) {
		// New domain model path — load Roster aggregate
		logger.debug('admin_jadwal_detail.load: new roster flow path', { eventId, churchId });
		const rosterService = new RosterService(repo);
		const eventService = new EventService(churchId);

		const [eventDetail, roster, communities] = await Promise.all([
			eventService.retrieveEventSchedule(eventId),
			rosterService.loadRoster(eventId),
			repo.listCommunitiesForChurch(churchId)
		]);
		logger.debug('admin_jadwal_detail.load: roster loaded', { eventId, hasRoster: !!roster, entryCount: roster?.entries.length ?? 0, communityCount: communities.length });

		const metadata = {
			event_id: eventId,
			has_roster: !!roster,
			entry_count: roster?.entries.length ?? 0,
			load_time_ms: Date.now() - startTime
		};

		await Promise.all([
			statsigService.logEvent('admin_jadwal_detail_view', 'load', session || undefined, metadata),
			trackServerEvent('admin_jadwal_detail_view', { event_type: 'page_load', ...metadata }, session || undefined)
		]);

		return {
			eventDetail,
			roster,
			communities,
			isNewRosterFlow: true,
			zones: [],
			wilayahs: [],
			lingkungans: [],
			events: [],
			eventsDate: [],
			success: false,
			assignedUshers: []
		};
	}

	// ── Legacy path ────────────────────────────────────────────────────────────
	const eventService = new EventService(churchId);
	const [eventDetail] = await Promise.all([eventService.retrieveEventSchedule(eventId)]);

	// Get zones
	const churchService = new ChurchService(churchId);
	const zoneGroups = await churchService.retrieveZoneGroupsByEvent(eventId);

	const metadata = {
		event_id: eventId,
		zone_count: zoneGroups.length,
		row_count: eventDetail.rows?.length ?? 0,
		has_pic_misa: !!eventDetail.description,
		load_time_ms: Date.now() - startTime
	};

	await Promise.all([
		statsigService.logEvent('admin_jadwal_detail_view', 'load', session || undefined, metadata),
		trackServerEvent('admin_jadwal_detail_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return {
		eventDetail,
		roster: null,
		communities: [],
		isNewRosterFlow: false,
		zones: zoneGroups,
		wilayahs: [],
		lingkungans: [],
		events: [],
		eventsDate: [],
		success: false,
		assignedUshers: []
	};
};

/** @satisfies {import('./$types').Actions} */
export const actions: Actions = {
	/**
	 * Create a new Roster for an event with the selected communities.
	 * Only available when new_roster_flow gate is on.
	 */
	createRoster: async (event: RequestEvent) => {
		const { churchId: _churchId, session } = await getAuthContext(event);

		if (!hasRole(session, 'admin')) {
			throw error(403, 'Tidak memiliki akses');
		}

		const createdByUserId = session?.user?.email ?? session?.user?.name ?? '';
		if (!createdByUserId) {
			throw error(401, 'Sesi tidak valid');
		}

		const eventId = event.params.id;
		const formData = await event.request.formData();
		const communityIds = formData.getAll('communityIds').map(String).filter(Boolean);

		if (!communityIds.length) {
			return fail(400, { error: 'Pilih minimal satu lingkungan' });
		}

		logger.debug('admin_roster_create: creating roster', { eventId, communityCount: communityIds.length, createdByUserId });
		const rosterService = new RosterService(repo);

		try {
			const roster = await rosterService.createRoster({ eventId, createdByUserId, communityIds });
			logger.info('admin_roster_create: success', { rosterId: roster.id, eventId });

			await Promise.all([
				statsigService.logEvent('admin_roster_create', 'submit', session || undefined, {
					event_id: eventId,
					roster_id: roster.id,
					community_count: communityIds.length
				}),
				trackServerEvent('admin_roster_create', {
					event_type: 'create_roster',
					event_id: eventId,
					roster_id: roster.id,
					community_count: communityIds.length
				}, session || undefined)
			]);

			return { success: true };
		} catch (err) {
			if (err instanceof ServiceError) {
				if (err.type === ServiceErrorType.VALIDATION_ERROR) {
					return fail(422, { error: err.message });
				}
				if (err.type === ServiceErrorType.NOT_FOUND_ERROR) {
					return fail(404, { error: err.message });
				}
			}
			logger.error('admin_roster_create: Unexpected error', { err });
			return fail(500, { error: 'Terjadi kesalahan internal. Silakan coba lagi.' });
		}
	},

	/**
	 * Confirm a community's submitted usher list (submitted → confirmed).
	 * Only available when new_roster_flow gate is on.
	 */
	confirmEntry: async (event: RequestEvent) => {
		const { churchId: _churchId, session } = await getAuthContext(event);

		if (!hasRole(session, 'admin')) {
			throw error(403, 'Tidak memiliki akses');
		}

		const confirmedByUserId = session?.user?.email ?? session?.user?.name ?? '';
		if (!confirmedByUserId) {
			throw error(401, 'Sesi tidak valid');
		}

		const formData = await event.request.formData();
		const rosterId = (formData.get('rosterId') as string)?.trim();
		const communityId = (formData.get('communityId') as string)?.trim();

		if (!rosterId || !communityId) {
			return fail(400, { error: 'Roster ID dan Community ID wajib diisi' });
		}

		logger.debug('admin_roster_confirm_entry: confirming entry', { rosterId, communityId, confirmedByUserId });
		const rosterService = new RosterService(repo);

		try {
			await rosterService.confirmEntry({ rosterId, communityId, confirmedByUserId });
			logger.info('admin_roster_confirm_entry: success', { rosterId, communityId });

			await Promise.all([
				statsigService.logEvent('admin_roster_confirm_entry', 'submit', session || undefined, {
					roster_id: rosterId,
					community_id: communityId
				}),
				trackServerEvent('admin_roster_confirm_entry', {
					event_type: 'confirm_entry',
					roster_id: rosterId,
					community_id: communityId
				}, session || undefined)
			]);

			return { success: true };
		} catch (err) {
			if (err instanceof ServiceError) {
				if (err.type === ServiceErrorType.CONFLICT_ERROR) {
					return fail(409, {
						error: 'Data telah diubah oleh pengguna lain. Silakan muat ulang halaman dan coba lagi.'
					});
				}
				if (err.type === ServiceErrorType.VALIDATION_ERROR) {
					return fail(422, { error: err.message });
				}
				if (err.type === ServiceErrorType.NOT_FOUND_ERROR) {
					return fail(404, { error: err.message });
				}
			}
			logger.error('admin_roster_confirm_entry: Unexpected error', { err });
			return fail(500, { error: 'Terjadi kesalahan internal. Silakan coba lagi.' });
		}
	},

	/**
	 * Reopen a submitted/confirmed entry back to draft.
	 * Only available when new_roster_flow gate is on.
	 */
	reopenEntry: async (event: RequestEvent) => {
		const { churchId: _churchId, session } = await getAuthContext(event);

		if (!hasRole(session, 'admin')) {
			throw error(403, 'Tidak memiliki akses');
		}

		const formData = await event.request.formData();
		const rosterId = (formData.get('rosterId') as string)?.trim();
		const communityId = (formData.get('communityId') as string)?.trim();

		if (!rosterId || !communityId) {
			return fail(400, { error: 'Roster ID dan Community ID wajib diisi' });
		}

		logger.debug('admin_roster_reopen_entry: reopening entry', { rosterId, communityId });
		const rosterService = new RosterService(repo);

		try {
			await rosterService.reopenEntry(rosterId, communityId);
			logger.info('admin_roster_reopen_entry: success →draft', { rosterId, communityId });

			await Promise.all([
				statsigService.logEvent('admin_roster_reopen_entry', 'submit', session || undefined, {
					roster_id: rosterId,
					community_id: communityId
				}),
				trackServerEvent('admin_roster_reopen_entry', {
					event_type: 'reopen_entry',
					roster_id: rosterId,
					community_id: communityId
				}, session || undefined)
			]);

			return { success: true };
		} catch (err) {
			if (err instanceof ServiceError) {
				if (err.type === ServiceErrorType.CONFLICT_ERROR) {
					return fail(409, {
						error: 'Data telah diubah oleh pengguna lain. Silakan muat ulang halaman dan coba lagi.'
					});
				}
				if (err.type === ServiceErrorType.VALIDATION_ERROR) {
					return fail(422, { error: err.message });
				}
			}
			logger.error('admin_roster_reopen_entry: Unexpected error', { err });
			return fail(500, { error: 'Terjadi kesalahan internal. Silakan coba lagi.' });
		}
	},

	/**
	 * Deactivates (soft deletes) an event.
	 */
	deactivate: async (event: RequestEvent) => {
		const { churchId, session } = await getAuthContext(event);
		const eventId = event.params.id;

		const eventService = new EventService(churchId);

		try {
			logger.info(`Deactivating event ${eventId} by ${session?.user?.name}`);
			const result = await eventService.deactivateEvent(eventId);
			if (!result) {
				throw ServiceError.database('Gagal menonaktifkan jadwal');
			}

			await Promise.all([
				statsigService.logEvent('admin_jadwal_detail_deactivate', 'submit', session || undefined, { event_id: eventId }),
				trackServerEvent('admin_jadwal_detail_deactivate', { event_type: 'deactivate', event_id: eventId }, session || undefined)
			]);
		} catch (err) {
			logger.error('Error deactivating event:', err);
			throw ServiceError.database('Gagal menonaktifkan jadwal');
		}

		return redirect(303, '/admin/tatib');
	},

	/**
	 * Updates event's PIC.
	 */
	updatePic: async (event: RequestEvent) => {
		const { churchId, session } = await getAuthContext(event);
		const eventId = event.params.id;

		const formData = await event.request.formData();
		const mode = formData.get('mode') as string | null;
		const zone = formData.get('zone') as string;
		const name = formData.get('pic') as string;
		const isMisaPic = formData.get('is_misa_pic') === 'true';

		const eventService = new EventService(churchId);
		if (mode === 'edit') {
			await eventService.updateEventPic(eventId, zone, name);
		} else {
			await eventService.assignEventPic({ event: eventId, zone, name });
		}

		const picMetadata = { event_id: eventId, zone_id: zone, mode: mode ?? 'add', is_misa_pic: isMisaPic };
		await Promise.all([
			statsigService.logEvent('admin_jadwal_detail_pic_update', 'submit', session || undefined, picMetadata),
			trackServerEvent('admin_jadwal_detail_pic_update', { event_type: 'pic_update', ...picMetadata }, session || undefined)
		]);

		return { success: true };
	},

	/**
	 * Deletes event usher for a specific lingkungan.
	 */
	deleteEventUsher: async (event: RequestEvent) => {
		const { churchId, session } = await getAuthContext(event);
		const eventId = event.params.id;

		const formData = await event.request.formData();
		const lingkungan = formData.get('lingkungan') as string;

		const eventService = new EventService(churchId);

		if (!hasRole(session, 'admin')) {
			throw error(403, 'Tidak memiliki akses');
		}

		await eventService.removeUsherAssignment(eventId, lingkungan);
		logger.info(`Event usher deleted: ${lingkungan} by ${session?.user?.name}`);

		const usherMetadata = { event_id: eventId, lingkungan_id: lingkungan };
		await Promise.all([
			statsigService.logEvent('admin_jadwal_detail_usher_delete', 'submit', session || undefined, usherMetadata),
			trackServerEvent('admin_jadwal_detail_usher_delete', { event_type: 'usher_delete', ...usherMetadata }, session || undefined)
		]);

		return { success: true };
	}
};
