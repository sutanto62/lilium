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
        logger.debug(`loaded event: ${JSON.stringify(event)}`);

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
        } catch (err) {
            logger.error('Error updating event:', err);
            return fail(500, { error: 'Gagal memperbarui data misa' });
        }

        return {
            success: true
        };
    }
} satisfies Actions;

// const eventId = params.id;
//         const eventService = new EventService(churchId);

//         try {
//             const formData = await request.formData();
//             const date = formData.get('date') as string;
//             const church = formData.get('church') as string;
//             const code = formData.get('code') as string;
//             const description = formData.get('description') as string;
//             const isComplete = parseInt(formData.get('isComplete') as string);
//             const active = parseInt(formData.get('active') as string);

//             await eventService.updateEventById(eventId, {
//                 date,
//                 church,
//                 code,
//                 description,
//                 isComplete,
//                 active,
//                 type: EventType.MASS
//             });

//             return { success: true };
//         } catch (err) {
//             logger.error('Error updating event:', err);
//             return fail(500, { error: 'Gagal memperbarui data misa' });
//         }
//     }
// } satisfies Actions; 