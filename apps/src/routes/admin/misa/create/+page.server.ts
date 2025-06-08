import type { Event as ChurchEvent, EventType } from "$core/entities/Event";
import { ChurchService } from "$core/service/ChurchService";
import { EventService } from "$core/service/EventService";
import { hasRole } from "$src/auth";
import { statsigService } from "$src/lib/application/StatsigService";
import { handlePageLoad } from "$src/lib/server/pageHandler";
import { logger } from "$src/lib/utils/logger";
import type { RequestEvent } from "@sveltejs/kit";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
    await statsigService.use();

    const { session } = await handlePageLoad(event, 'misa-create');

    if (!session) {
        return {
            success: false,
            error: 'Unauthorized'
        };
    }

    const churchId = session.user?.cid;

    if (!churchId) {
        return {
            success: false,
            error: 'Church ID not found'
        };
    }

    const churchService = new ChurchService(churchId);
    const masses = await churchService.getMasses();

    return {
        success: true,
        church: {
            masses
        }
    };
};

export const actions: Actions = {
    default: async ({ request, locals }: RequestEvent) => {
        const session = await locals.auth();
        if (!hasRole(session, 'admin')) {
            return {
                success: false,
                error: 'Unauthorized'
            };
        }

        if (!session?.user?.cid) {
            return {
                success: false,
                error: 'Church ID not found'
            };
        }

        const formData = await request.formData();
        const newEvent: Omit<ChurchEvent, 'id' | 'createdAt'> = {
            church: session?.user?.cid as string,
            date: formData.get('date') as string,
            mass: formData.get('mass') as string,
            type: formData.get('type') as EventType,
            code: formData.get('code') as string,
            description: formData.get('description') as string,
            weekNumber: Number(formData.get('weekNumber')) || null,
            isComplete: 0,
            active: 1,
        }

        const eventService = new EventService(session?.user?.cid as string);

        try {
            const insertedEvent = await eventService.createEvent(newEvent);
            return {
                success: true,
                message: 'Misa berhasil dibuat'
            };
        } catch (error) {
            logger.error(`Failed to create event: ${error}`);
            return fail(500, {
                error: `Gagal membuat misa ${error}`
            });
        }
    }
} satisfies Actions;
