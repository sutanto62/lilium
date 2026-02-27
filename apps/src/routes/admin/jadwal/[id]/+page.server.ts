import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

// Services
import { ServiceError } from '$core/errors/ServiceError';
import { ChurchService } from '$core/service/ChurchService';
import { EventService } from '$core/service/EventService';
import { hasRole } from '$src/auth';
import { posthogService } from '$src/lib/application/PostHogService';
import { statsigService } from '$src/lib/application/StatsigService';

async function getAuthContext(event: RequestEvent): Promise<{ churchId: string; session: Awaited<ReturnType<typeof event.locals.auth>> }> {
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
		posthogService.trackEvent('admin_jadwal_detail_view', { event_type: 'page_load', ...metadata }, session || undefined)
	]);

	return {
		eventDetail,
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
	 * Deactivates (soft deletes) an event
	 * @param event The request event containing session data and params
	 * @throws {error} 404 if church ID is not found in session
	 * @throws {redirect} 303 redirect to jadwal page after successful deactivation
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
				posthogService.trackEvent('admin_jadwal_detail_deactivate', { event_type: 'deactivate', event_id: eventId }, session || undefined)
			]);
		} catch (error) {
			logger.error('Error deactivating event:', error);
			throw ServiceError.database('Gagal menonaktifkan jadwal');
		}

		return redirect(303, '/admin/jadwal');
	},
	/**
	 * Updates event's PIC
	 * @param event The request event containing session data and params
	 * @throws {error} 404 if church ID is not found in session
	 * @throws {redirect} 303 redirect to jadwal page after successful deactivation
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
			posthogService.trackEvent('admin_jadwal_detail_pic_update', { event_type: 'pic_update', ...picMetadata }, session || undefined)
		]);

		return { success: true };
	},
	/**
	 * Deletes event usher for a specific lingkungan
	 * @param event The request event containing session data and params 
	 * @throws {error} 404 if church ID is not found in session
	 * @returns {success: true} on successful deletion
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
			posthogService.trackEvent('admin_jadwal_detail_usher_delete', { event_type: 'usher_delete', ...usherMetadata }, session || undefined)
		]);

		return { success: true };
	},
};
