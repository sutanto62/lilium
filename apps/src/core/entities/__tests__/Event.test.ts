import { describe, expect, it } from 'vitest';
import type { Event, EventPicRequest, EventUsher, JadwalDetailResponse, UsherByEvent } from '../Event';
import { EventType } from '../Event';

describe('Event Entity', () => {
    describe('Event Interface', () => {
        it('should create a valid Event object', () => {
            const event: Event = {
                id: '1',
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20',
                weekNumber: 12,
                createdAt: 1710892800000,
                isComplete: 1,
                active: 1,
                type: EventType.MASS,
                code: 'M1',
                description: 'Regular Mass'
            };

            expect(event).toBeDefined();
            expect(event.id).toBe('1');
            expect(event.church).toBe('church-1');
            expect(event.mass).toBe('mass-1');
            expect(event.date).toBe('2024-03-20');
            expect(event.weekNumber).toBe(12);
            expect(event.createdAt).toBe(1710892800000);
            expect(event.isComplete).toBe(1);
            expect(event.active).toBe(1);
            expect(event.type).toBe(EventType.MASS);
            expect(event.code).toBe('M1');
            expect(event.description).toBe('Regular Mass');
        });

        it('should create an Event object with minimal required fields', () => {
            const event: Event = {
                id: '1',
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20'
            };

            expect(event).toBeDefined();
            expect(event.id).toBe('1');
            expect(event.church).toBe('church-1');
            expect(event.mass).toBe('mass-1');
            expect(event.date).toBe('2024-03-20');
        });
    });

    describe('EventUsher Interface', () => {
        it('should create a valid EventUsher object', () => {
            const eventUsher: EventUsher = {
                id: '1',
                event: 'event-1',
                name: 'John Doe',
                wilayah: 'wilayah-1',
                lingkungan: 'lingkungan-1',
                isPpg: true,
                isKolekte: false,
                position: 'position-1',
                createdAt: 1710892800000
            };

            expect(eventUsher).toBeDefined();
            expect(eventUsher.id).toBe('1');
            expect(eventUsher.event).toBe('event-1');
            expect(eventUsher.name).toBe('John Doe');
            expect(eventUsher.wilayah).toBe('wilayah-1');
            expect(eventUsher.lingkungan).toBe('lingkungan-1');
            expect(eventUsher.isPpg).toBe(true);
            expect(eventUsher.isKolekte).toBe(false);
            expect(eventUsher.position).toBe('position-1');
            expect(eventUsher.createdAt).toBe(1710892800000);
        });
    });

    describe('EventPicRequest Interface', () => {
        it('should create a valid EventPicRequest object', () => {
            const eventPicRequest: EventPicRequest = {
                event: 'event-1',
                zone: 'zone-1',
                name: 'John Doe'
            };

            expect(eventPicRequest).toBeDefined();
            expect(eventPicRequest.event).toBe('event-1');
            expect(eventPicRequest.zone).toBe('zone-1');
            expect(eventPicRequest.name).toBe('John Doe');
        });
    });

    describe('UsherByEvent Interface', () => {
        it('should create a valid UsherByEvent object', () => {
            const usherByEvent: UsherByEvent = {
                id: '1',
                event: 'event-1',
                name: 'John Doe',
                zone: 'zone-1',
                wilayah: 'wilayah-1',
                lingkungan: 'lingkungan-1',
                isPpg: true,
                isKolekte: false,
                position: 'position-1',
                createdAt: 1710892800000
            };

            expect(usherByEvent).toBeDefined();
            expect(usherByEvent.id).toBe('1');
            expect(usherByEvent.event).toBe('event-1');
            expect(usherByEvent.name).toBe('John Doe');
            expect(usherByEvent.zone).toBe('zone-1');
            expect(usherByEvent.wilayah).toBe('wilayah-1');
            expect(usherByEvent.lingkungan).toBe('lingkungan-1');
            expect(usherByEvent.isPpg).toBe(true);
            expect(usherByEvent.isKolekte).toBe(false);
            expect(usherByEvent.position).toBe('position-1');
            expect(usherByEvent.createdAt).toBe(1710892800000);
        });
    });

    describe('JadwalDetailResponse Interface', () => {
        it('should create a valid JadwalDetailResponse object', () => {
            const jadwalDetailResponse: JadwalDetailResponse = {
                id: '1',
                church: 'Church Name',
                mass: 'Mass Name',
                date: '2024-03-20',
                rows: [
                    {
                        id: 'zone-1',
                        name: 'Zone 1',
                        lingkungan: ['Lingkungan 1', 'Lingkungan 2'],
                        pic: ['John Doe'],
                        zoneUshers: 5,
                        zonePpg: 2,
                        zoneKolekte: 1,
                        detail: [
                            {
                                name: 'Lingkungan 1',
                                zone: 'Zone 1',
                                id: 'lingkungan-1',
                                ushers: [
                                    {
                                        name: 'John Doe',
                                        position: 'Position 1',
                                        isPpg: true,
                                        isKolekte: false
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            expect(jadwalDetailResponse).toBeDefined();
            expect(jadwalDetailResponse.id).toBe('1');
            expect(jadwalDetailResponse.church).toBe('Church Name');
            expect(jadwalDetailResponse.mass).toBe('Mass Name');
            expect(jadwalDetailResponse.date).toBe('2024-03-20');
            expect(jadwalDetailResponse.rows).toHaveLength(1);
            expect(jadwalDetailResponse.rows?.[0].id).toBe('zone-1');
            expect(jadwalDetailResponse.rows?.[0].name).toBe('Zone 1');
            expect(jadwalDetailResponse.rows?.[0].lingkungan).toHaveLength(2);
            expect(jadwalDetailResponse.rows?.[0].pic).toHaveLength(1);
            expect(jadwalDetailResponse.rows?.[0].zoneUshers).toBe(5);
            expect(jadwalDetailResponse.rows?.[0].zonePpg).toBe(2);
            expect(jadwalDetailResponse.rows?.[0].zoneKolekte).toBe(1);
            expect(jadwalDetailResponse.rows?.[0].detail).toHaveLength(1);
        });
    });

    describe('EventType Enum', () => {
        it('should have correct enum values', () => {
            expect(EventType.MASS).toBe('mass');
            expect(EventType.FEAST).toBe('feast');
        });
    });
});