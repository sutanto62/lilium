import type { ChurchEvent } from "$core/entities/Event";
import { EventType } from "$core/entities/Event";
import { ServiceError } from "$core/errors/ServiceError";
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
    const masses = await churchService.retrieveMasses();

    return {
        success: true,
        church: {
            masses
        }
    };
};

export const actions: Actions = {
    default: async ({ request, locals }: RequestEvent) => {
        logger.info('admin_misa_create: Starting event creation');

        const session = await locals.auth();
        if (!hasRole(session, 'admin')) {
            logger.warn('admin_misa_create: Unauthorized access attempt');
            return fail(403, {
                success: false,
                error: 'Anda tidak memiliki izin untuk membuat jadwal misa'
            });
        }

        if (!session?.user?.cid) {
            logger.error('admin_misa_create: Church ID not found in session');
            return fail(400, {
                success: false,
                error: 'ID gereja tidak ditemukan. Silakan login ulang.'
            });
        }

        const formData = await request.formData();
        const date = formData.get('date') as string;
        const mass = formData.get('mass') as string;
        const type = formData.get('type') as EventType;
        const code = formData.get('code') as string;
        const description = formData.get('description') as string;
        const weekNumber = formData.get('weekNumber') ? Number(formData.get('weekNumber')) : null;

        // Validation
        if (!date) {
            return fail(400, { error: 'Tanggal harus diisi' });
        }

        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return fail(400, { error: 'Tanggal tidak valid' });
        }

        if (!mass) {
            return fail(400, { error: 'Jenis Misa harus dipilih' });
        }

        if (!code || code.trim().length === 0) {
            return fail(400, { error: 'Kode harus diisi' });
        }

        if (!description || description.trim().length === 0) {
            return fail(400, { error: 'Nama harus diisi' });
        }

        if (!type || (type !== EventType.MASS && type !== EventType.FEAST)) {
            return fail(400, { error: 'Jenis perayaan tidak valid' });
        }

        const newEvent: Omit<ChurchEvent, 'id' | 'createdAt'> = {
            church: session.user.cid,
            date: date,
            mass: mass,
            type: type,
            code: code.trim(),
            description: description.trim(),
            weekNumber: weekNumber,
            isComplete: 0,
            active: 1,
        };

        const eventService = new EventService(session.user.cid);

        try {
            const insertedEvent = await eventService.createEvent(newEvent);
            logger.info('admin_misa_create: Successfully created event', { eventId: insertedEvent.id });
            return {
                success: true,
                message: 'Misa berhasil dibuat'
            };
        } catch (error) {
            logger.error('admin_misa_create: Failed to create event', { error, date, mass });
            
            // Handle ServiceError specifically
            if (error instanceof ServiceError) {
                if (error.type === 'DUPLICATE_ERROR') {
                    return fail(400, {
                        error: 'Jadwal misa untuk tanggal dan jenis misa ini sudah ada. Silakan edit jadwal yang ada atau pilih tanggal/jenis misa lain.'
                    });
                }
                if (error.type === 'VALIDATION_ERROR') {
                    return fail(400, {
                        error: error.message || 'Data yang dimasukkan tidak valid. Silakan periksa kembali.'
                    });
                }
            }
            
            return fail(500, {
                error: 'Gagal membuat misa. Silakan coba lagi atau hubungi administrator.'
            });
        }
    }
} satisfies Actions;
