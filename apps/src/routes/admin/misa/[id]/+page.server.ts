import { EventType } from '$core/entities/Event';
import { EventService } from '$core/service/EventService';
import { handlePageLoad } from '$src/lib/server/pageHandler';
import { logger } from '$src/lib/utils/logger';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';


export const load: PageServerLoad = async (event) => {
    const { session } = await handlePageLoad(event, 'misa');
    if (!session) {
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const eventId = event.params.id;
    const eventService = new EventService(churchId);

    try {
        const event = await eventService.getEventById(eventId);
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
    default: async ({ request, cookies, params }) => {
        const churchId = cookies.get('cid') as string;
        if (!churchId) {
            return fail(404, { error: 'Tidak ada gereja yang terdaftar' });
        }

        const eventService = new EventService(churchId);
        const data = await request.formData();

        const eventId = params.id;
        const eventMass = data.get('mass') as string;
        const eventDate = data.get('date') as string;
        const eventCode = data.get('code') as string;
        const eventDescription = data.get('description') as string;
        const eventIsComplete = parseInt(data.get('isComplete') as string);
        const eventActive = parseInt(data.get('active') as string);

        try {
            await eventService.updateEventById(eventId, {
                date: eventDate,
                code: eventCode,
                description: eventDescription,
                isComplete: eventIsComplete,
                active: eventActive,
                type: EventType.MASS,

            });
        } catch (error) {
            logger.error('Error updating event:', error);
            return fail(500, { error: `Gagal memperbarui data misa ${error}` });
        }

        return {
            success: true
        };
    }
} satisfies Actions;
