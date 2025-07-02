import type { EventUsher, UsherByEventResponse } from "$core/entities/Event";
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
        return await repo.getEventUshers(eventId);
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
     * @returns A promise that resolves to true if successful
     * @throws Error if assignment fails
     */
    async assignEventUshers(
        eventId: string,
        ushers: EventUsher[],
        wilayahId: string,
        lingkunganId: string
    ): Promise<boolean> {
        try {
            const result = await repo.insertEventUshers(eventId, ushers, wilayahId, lingkunganId);
            if (!result) {
                return false;
            }
            return true;
        } catch (error) {
            logger.error('Gagal menambahkan petugas pada tugas misa:', error);
            throw new Error('Sistem gagal mencatat petugas');
        }
    }
}
