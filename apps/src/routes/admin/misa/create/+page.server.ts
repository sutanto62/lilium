/**
 * Server-side page load and actions for creating a new Mass event
 * 
 * Handles:
 * - Loading available mass schedules for the create form
 * - Creating a new mass event with validation and error handling
 */
import type { ChurchEvent } from "$core/entities/Event";
import { EventType } from "$core/entities/Event";
import { ServiceError } from "$core/errors/ServiceError";
import { ChurchService } from "$core/service/ChurchService";
import { EventService } from "$core/service/EventService";
import { hasRole } from "$src/auth";
import { posthogService } from "$src/lib/application/PostHogService";
import { statsigService } from "$src/lib/application/StatsigService";
import { handlePageLoad } from "$src/lib/server/pageHandler";
import { logger } from "$src/lib/utils/logger";
import type { RequestEvent } from "@sveltejs/kit";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

/**
 * Server-side load function that fetches data for the create mass event form
 * 
 * Behavior:
 * - Authenticates user via handlePageLoad
 * - Retrieves available mass schedules for the church
 * - Returns masses list for the form dropdown
 * 
 * @param event - SvelteKit load event containing request, url, etc.
 * @returns Page data including available mass schedules
 */
export const load: PageServerLoad = async (event) => {
    const startTime = Date.now();
    await statsigService.use();

    // Authenticate user and check permissions
    const { session } = await handlePageLoad(event, 'misa-create');

    if (!session) {
        return {
            success: false,
            error: 'Unauthorized'
        };
    }

    // Get church ID from session
    const churchId = session.user?.cid;

    if (!churchId) {
        return {
            success: false,
            error: 'Church ID not found'
        };
    }

    // Retrieve available mass schedules for the form
    const churchService = new ChurchService(churchId);
    const masses = await churchService.retrieveMasses();

    // Track page load with performance and metadata
    const pageLoadMetadata = {
        masses_count: masses.length,
        load_time_ms: Date.now() - startTime,
        has_masses: masses.length > 0
    };

    await Promise.all([
        statsigService.logEvent('admin_misa_create_view', 'load', session || undefined, pageLoadMetadata),
        posthogService.trackEvent('admin_misa_create_view', {
            event_type: 'page_load',
            ...pageLoadMetadata
        }, session || undefined)
    ]);

    return {
        success: true,
        church: {
            masses
        }
    };
};

/**
 * Server actions for form submissions
 * 
 * The default action handles creation of a single mass event.
 */
export const actions: Actions = {
    /**
     * Create a new mass event
     * 
     * Process:
     * 1. Validates authentication and admin role
     * 2. Validates church ID from session
     * 3. Validates all form inputs (date, mass, type, code, description)
     * 4. Creates the event via EventService
     * 5. Returns success/error response with appropriate error messages
     * 
     * @param request - SvelteKit request object containing form data
     * @param locals - SvelteKit locals containing auth session
     * @returns Action result with success/error status and message
     */
    default: async ({ request, locals }: RequestEvent) => {
        logger.info('admin_misa_create.default: Starting event creation');

        // Authenticate user and check admin role
        const session = await locals.auth();
        if (!hasRole(session, 'admin')) {
            logger.warn('admin_misa_create.default: Unauthorized access attempt');

            // Track unauthorized access attempt
            await statsigService.logEvent('admin_misa_create_error', 'unauthorized', undefined, {
                error_type: 'authorization_failed',
                error_message: 'Admin role required'
            });

            return fail(403, {
                success: false,
                error: 'Anda tidak memiliki izin untuk membuat jadwal misa'
            });
        }

        // Validate church ID from session
        if (!session?.user?.cid) {
            logger.error('admin_misa_create.default: Church ID not found in session');

            // Track missing church ID error
            await statsigService.logEvent('admin_misa_create_error', 'missing_church_id', session || undefined, {
                error_type: 'validation_failed',
                error_message: 'Church ID not found in session'
            });

            return fail(400, {
                success: false,
                error: 'ID gereja tidak ditemukan. Silakan login ulang.'
            });
        }

        // Extract form data
        const formData = await request.formData();
        const date = formData.get('date') as string;
        const mass = formData.get('mass') as string;
        const type = formData.get('type') as EventType;
        const code = formData.get('code') as string;
        const description = formData.get('description') as string;
        const weekNumber = formData.get('weekNumber') ? Number(formData.get('weekNumber')) : null;

        // Validate required fields
        if (!date) {
            await statsigService.logEvent('admin_misa_create', 'validation_error', session || undefined, {
                error_field: 'date',
                error_type: 'missing'
            });
            return fail(400, { error: 'Tanggal harus diisi' });
        }

        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            await statsigService.logEvent('admin_misa_create', 'validation_error', session || undefined, {
                error_field: 'date',
                error_type: 'invalid'
            });
            return fail(400, { error: 'Tanggal tidak valid' });
        }

        if (!mass) {
            await statsigService.logEvent('admin_misa_create', 'validation_error', session || undefined, {
                error_field: 'mass',
                error_type: 'missing'
            });
            return fail(400, { error: 'Jenis Misa harus dipilih' });
        }

        if (!code || code.trim().length === 0) {
            await statsigService.logEvent('admin_misa_create', 'validation_error', session || undefined, {
                error_field: 'code',
                error_type: 'missing'
            });
            return fail(400, { error: 'Kode harus diisi' });
        }

        if (!description || description.trim().length === 0) {
            await statsigService.logEvent('admin_misa_create', 'validation_error', session || undefined, {
                error_field: 'description',
                error_type: 'missing'
            });
            return fail(400, { error: 'Nama harus diisi' });
        }

        // Validate event type enum
        if (!type || (type !== EventType.MASS && type !== EventType.FEAST)) {
            await statsigService.logEvent('admin_misa_create', 'validation_error', session || undefined, {
                error_field: 'type',
                error_type: 'invalid'
            });
            return fail(400, { error: 'Jenis perayaan tidak valid' });
        }

        // Build event object (id and createdAt will be generated by service)
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

        // Create event via service
        const eventService = new EventService(session.user.cid);

        try {
            const insertedEvent = await eventService.createEvent(newEvent);
            logger.info('admin_misa_create.default: Successfully created event', { eventId: insertedEvent.id });

            // Track successful event creation
            const successMetadata = {
                event_id: insertedEvent.id,
                date: date,
                mass_id: mass,
                type: type,
                week_number: weekNumber
            };

            await Promise.all([
                statsigService.logEvent('admin_misa_create', 'success', session || undefined, successMetadata),
                posthogService.trackEvent('admin_misa_create_success', {
                    event_type: 'form_submission',
                    ...successMetadata
                }, session || undefined)
            ]);

            return {
                success: true,
                message: 'Misa berhasil dibuat'
            };
        } catch (error) {
            logger.error('admin_misa_create.default: Failed to create event', { error, date, mass });

            // Track error with metadata
            const errorMetadata = {
                error_type: error instanceof Error ? error.name : 'unknown',
                error_message: error instanceof Error ? error.message : String(error),
                date: date,
                mass_id: mass,
                service_error_type: error instanceof ServiceError ? error.type : null
            };

            await Promise.all([
                statsigService.logEvent('admin_misa_create_error', 'form_submission_failed', session || undefined, errorMetadata),
                posthogService.trackEvent('admin_misa_create_error', {
                    event_type: 'form_submission_failed',
                    ...errorMetadata
                }, session || undefined)
            ]);

            // Handle ServiceError with specific error types
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

            // Handle unexpected errors
            return fail(500, {
                error: 'Gagal membuat misa. Silakan coba lagi atau hubungi administrator.'
            });
        }
    }
} satisfies Actions;
