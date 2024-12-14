/*

import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import type { Church, ChurchPosition, ChurchZone, Usher } from '$core/entities/schedule';

// Adapter
export class PostgresDatabase implements ScheduleRepository {
    private db: ReturnType<typeof drizzle>;

    constructor(db: ReturnType<typeof drizzle>) {
        this.db = db;
    }


    getWilayahs = () => {
        throw new Error('Not implemented');
    };
    getLingkungans = () => {
        throw new Error('Not implemented');
    };
    getMasses = () => {
        throw new Error('Not implemented');
    };
    getMassById = (id: string) => {
        throw new Error('Not implemented');
    };
    insertEvent = (massId: string, date: string) => {
        throw new Error('Not implemented');
    };
    insertEventUshers = (
        eventId: string,
        ushers: Usher[],
        wilayahId: string,
        lingkunganId: string) => {
        throw new Error('Not implemented');
    };
    findChurchById(id: string): Promise<Church | null> {
        throw new Error('Method not implemented.');
    }
    findZoneByChurch(id: string): Promise<ChurchZone | null> {
        throw new Error('Method not implemented.');
    }
    findPositionByChurch(id: string): Promise<ChurchPosition | null> {
        throw new Error('Method not implemented.');
    }
}
*/
