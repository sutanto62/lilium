import type { EventUsher, UsherByEventResponse } from "$core/entities/Event";
import { ServiceError } from "$core/errors/ServiceError";
import { repo } from "$src/lib/server/db";
import { logger } from "$src/lib/utils/logger";

export class UsherService {

    constructor(private churchId: string) { }

    /**
     * Retrieves formatted usher assignments for a specific event
     * @param eventId - The ID of the event
     * @returns A promise that resolves to an array of UsherByEvent objects
     */
    async retrieveEventUshers(eventId: string): Promise<UsherByEventResponse[]> {
        return await repo.listUshers(eventId);
    }

    /**
     * Retrieves formatted usher assignments for a specific event by lingkungan
     * @param eventId - The ID of the event
     * @param lingkunganId - The ID of the lingkungan
     * @returns A promise that resolves to an array of UsherByEvent objects
     */
    async retrieveEventUshersByLingkungan(eventId: string, lingkunganId: string): Promise<UsherByEventResponse[]> {
        return await repo.listUshersByLingkungan(eventId, lingkunganId);
    }

    /**
     * Retrieves all ushers assigned to a specific event
     * @param eventId - The ID of the event
     * @returns A promise that resolves to an array of EventUsher objects
     */
    async retrieveEventUsherAssignments(eventId: string): Promise<EventUsher[]> {
        return await repo.findEventUshers(eventId);
    }

    /**
     * Retrieves usher positions for a specific event
     * @param eventId - The ID of the event
     * @param isPpg - Flag indicating if positions are for PPG
     * @returns A promise that resolves to an array of position strings
     */
    async retrieveEventUshersPositions(eventId: string, isPpg: boolean): Promise<string[]> {
        return await repo.getEventUshersPosition(eventId, isPpg);
    }

    /**
     * Assigns ushers to an event
     * @param eventId - The ID of the event
     * @param ushers - Array of ushers to assign
     * @param wilayahId - The ID of the wilayah
     * @param lingkunganId - The ID of the lingkungan
     * @returns A promise that resolves to the created date timestamp
     * @throws ServiceError.validation when lingkungan already submitted
     * @throws ServiceError.database when database operation fails
     */
    async assignEventUshers(
        eventId: string,
        ushers: EventUsher[],
        wilayahId: string,
        lingkunganId: string
    ): Promise<number> {
        try {
            const createdDate = await repo.insertEventUshers(eventId, ushers, wilayahId, lingkunganId);

            // Repository returns 0 when lingkungan already submitted
            if (createdDate === 0) {
                logger.warn(`lingkungan ${lingkunganId} sudah melakukan konfirmasi tugas`);
                throw ServiceError.validation('Lingkungan Bapak/Ibu sudah melakukan konfirmasi tugas');
            }

            return createdDate;
        } catch (error) {
            // If it's already a ServiceError, re-throw it
            if (error instanceof ServiceError) {
                throw error;
            }

            // Log the original error for debugging
            logger.error('failed to add ushers to event:', error);

            // Convert generic errors to ServiceError.database
            throw ServiceError.database('Sistem gagal mencatat petugas', {
                originalError: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
