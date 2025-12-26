import { EventType } from '$core/entities/Event';
import { EventService } from '$core/service/EventService';
import { statsigService } from '$src/lib/application/StatsigService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';


export const load: PageServerLoad = async (event) => {
    await statsigService.use();

    const { session } = await handlePageLoad(event, 'misa');
    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventId = event.params.id;
    const eventService = new EventService(churchId);

    try {
        const event = await eventService.retrieveEventById(eventId);
        if (!event) {
            throw redirect(302, '/admin/misa');
        }

        return {
            event,
            success: false
        };
    } catch (err) {
        logger.error('Error loading event:', err);
        throw redirect(302, '/admin/misa');
    }
};

export const actions = {
    default: async ({ request, params, locals }) => {
        logger.info('admin_misa_edit: Starting event update', { eventId: params.id });

        const session = await locals.auth();
        if (!session) {
            logger.error('admin_misa_edit: No session found');
            return fail(401, { error: 'Anda harus login untuk mengedit jadwal misa' });
        }

        const churchId = session.user?.cid ?? '';
        if (!churchId) {
            logger.error('admin_misa_edit: Church ID not found in session');
            return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
        }

        const eventService = new EventService(churchId);
        const formData = await request.formData();

        const eventId = params.id;
        if (!eventId) {
            logger.error('admin_misa_edit: Event ID not found in params');
            return fail(400, { error: 'ID misa tidak ditemukan' });
        }

        const eventDate = formData.get('date') as string;
        const eventCode = formData.get('code') as string;
        const eventDescription = formData.get('description') as string;
        const eventIsComplete = parseInt(formData.get('isComplete') as string);
        const eventActive = parseInt(formData.get('active') as string);

        // Validation
        if (!eventDate) {
            return fail(400, { error: 'Tanggal harus diisi' });
        }

        const dateObj = new Date(eventDate);
        if (isNaN(dateObj.getTime())) {
            return fail(400, { error: 'Tanggal tidak valid' });
        }

        if (!eventCode || eventCode.trim().length === 0) {
            return fail(400, { error: 'Kode harus diisi' });
        }

        if (!eventDescription || eventDescription.trim().length === 0) {
            return fail(400, { error: 'Nama harus diisi' });
        }

        if (isNaN(eventIsComplete) || (eventIsComplete !== 0 && eventIsComplete !== 1)) {
            return fail(400, { error: 'Status tidak valid' });
        }

        if (isNaN(eventActive) || (eventActive !== 0 && eventActive !== 1)) {
            return fail(400, { error: 'Status aktif tidak valid' });
        }

        try {
            // Verify event exists and belongs to church
            const existingEvent = await eventService.retrieveEventById(eventId);
            if (!existingEvent) {
                logger.warn('admin_misa_edit: Event not found', { eventId });
                return fail(404, { error: 'Jadwal misa tidak ditemukan' });
            }

            if (existingEvent.church !== churchId) {
                logger.warn('admin_misa_edit: Event does not belong to church', { eventId, churchId });
                return fail(403, { error: 'Anda tidak memiliki akses untuk mengedit jadwal misa ini' });
            }

            await eventService.updateEvent(eventId, {
                date: eventDate,
                code: eventCode.trim(),
                description: eventDescription.trim(),
                isComplete: eventIsComplete,
                active: eventActive,
                type: EventType.MASS,
            });

            logger.info('admin_misa_edit: Successfully updated event', { eventId });
            return {
                success: true
            };
        } catch (error) {
            logger.error('admin_misa_edit: Error updating event', { error, eventId });
            return fail(500, { error: 'Gagal memperbarui data misa. Silakan coba lagi atau hubungi administrator.' });
        }
    }
} satisfies Actions;
