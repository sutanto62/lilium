import type { ChurchEvent, EventUsher } from '$core/entities/Event';
import { repo } from '$src/lib/server/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventService } from '../EventService';

// Mock the database repository
vi.mock('$src/lib/server/db', () => ({
    repo: {
        getEventsByWeekNumber: vi.fn(),
        getEventsByDateRange: vi.fn(),
        listEventsByWeekNumber: vi.fn(),
        listEventsByDateRange: vi.fn(),
        getEventById: vi.fn(),
        updateEventById: vi.fn(),
        findEventById: vi.fn(),
        listUshers: vi.fn(),
        listUsherByEvent: vi.fn(),
        getEventUshers: vi.fn(),
        getEventUshersPosition: vi.fn(),
        findJadwalDetail: vi.fn(),
        deactivateEvent: vi.fn(),
        removeEventUsher: vi.fn(),
        getEventByChurch: vi.fn(),
        insertEvent: vi.fn(),
        insertEventUshers: vi.fn(),
        persistEventUshers: vi.fn(),
        createEventPic: vi.fn(),
        updateEventPic: vi.fn(),
        findCetakJadwal: vi.fn()
    }
}));

describe('EventService', () => {
    let eventService: EventService;
    const mockChurchId = 'church-1';

    beforeEach(() => {
        eventService = new EventService(mockChurchId);
        vi.clearAllMocks();
    });

    describe('getEventsByWeekNumber', () => {
        it('should return events for specified week numbers', async () => {
            const mockEvents: ChurchEvent[] = [
                {
                    id: '1',
                    church: 'church-1',
                    mass: 'mass-1',
                    date: '2024-03-20',
                    weekNumber: 12
                }
            ];

            vi.mocked(repo.listEventsByWeekNumber).mockResolvedValue(mockEvents);

            const result = await eventService.retrieveEventsByWeekRange({ weekNumber: 12 });

            expect(repo.listEventsByWeekNumber).toHaveBeenCalledWith(mockChurchId, [12, 13], false, undefined);
            expect(result).toEqual(mockEvents);
        });

        it('should return events for multiple week numbers', async () => {
            const mockEvents: ChurchEvent[] = [
                {
                    id: '1',
                    church: 'church-1',
                    mass: 'mass-1',
                    date: '2024-03-20',
                    weekNumber: 12
                }
            ];

            vi.mocked(repo.listEventsByWeekNumber).mockResolvedValue(mockEvents);

            const result = await eventService.retrieveEventsByWeekRange({ weekNumbers: [12, 13] });

            expect(repo.listEventsByWeekNumber).toHaveBeenCalledWith(mockChurchId, [12, 13], false, undefined);
            expect(result).toEqual(mockEvents);
        });
    });

    describe('getEventsByDateRange', () => {
        it('should return events within date range', async () => {
            const mockEvents: ChurchEvent[] = [
                {
                    id: '1',
                    church: 'church-1',
                    mass: 'mass-1',
                    date: '2024-03-20'
                }
            ];

            vi.mocked(repo.listEventsByDateRange).mockResolvedValue(mockEvents);

            const result = await eventService.listEventsByDateRange('2024-03-01', '2024-03-31');

            expect(repo.listEventsByDateRange).toHaveBeenCalledWith(mockChurchId, '2024-03-01', '2024-03-31');
            expect(result).toEqual(mockEvents);
        });
    });

    describe('getEventById', () => {
        it('should return event by id', async () => {
            const mockEvent: ChurchEvent = {
                id: '1',
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20'
            };

            vi.mocked(repo.getEventById).mockResolvedValue(mockEvent);

            const result = await eventService.retrieveEventById('1');

            expect(repo.getEventById).toHaveBeenCalledWith('1');
            expect(result).toEqual(mockEvent);
        });
    });

    describe('updateEventById', () => {
        it('should update event successfully', async () => {
            const mockEvent: ChurchEvent = {
                id: '1',
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20',
                code: 'M1',
                description: 'Updated Mass'
            };

            vi.mocked(repo.getEventById).mockResolvedValue({
                id: '1',
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20'
            });

            vi.mocked(repo.updateEventById).mockResolvedValue(mockEvent);

            const result = await eventService.updateEvent('1', {
                date: '2024-03-20',
                code: 'M1',
                description: 'Updated Mass'
            });

            expect(repo.updateEventById).toHaveBeenCalled();
            expect(result).toEqual(mockEvent);
        });

        it('should throw error when code is missing', async () => {
            await expect(eventService.updateEvent('1', {
                date: '2024-03-20',
                description: 'Updated Mass'
            })).rejects.toThrow('Kode tidak ditemukan');
        });

        it('should throw error when description is missing', async () => {
            await expect(eventService.updateEvent('1', {
                date: '2024-03-20',
                code: 'M1'
            })).rejects.toThrow('Deskripsi tidak ditemukan');
        });
    });

    describe('getEventUshers', () => {
        it('should return event ushers', async () => {
            const mockUshers = [
                {
                    id: '1',
                    event: 'event-1',
                    name: 'John Doe',
                    zone: 'zone-1',
                    wilayah: 'wilayah-1',
                    lingkungan: 'lingkungan-1',
                    isPpg: true,
                    isKolekte: false,
                    position: 'position-1',
                    sequence: 1,
                    createdAt: 1710892800000
                }
            ];

            vi.mocked(repo.listUsherByEvent).mockResolvedValue(mockUshers);

            const result = await eventService.retrieveEventUshers('event-1');

            expect(repo.listUsherByEvent).toHaveBeenCalledWith('event-1');
            expect(result).toEqual(mockUshers);
        });
    });

    describe('insertEvent', () => {
        it('should insert new event successfully', async () => {
            const mockEvent: ChurchEvent = {
                id: '1',
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20',
                code: 'M1',
                description: 'New Mass'
            };

            vi.mocked(repo.insertEvent).mockResolvedValue(mockEvent);

            const result = await eventService.createEvent({
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20',
                code: 'M1',
                description: 'New Mass'
            });

            expect(repo.insertEvent).toHaveBeenCalled();
            expect(result).toEqual(mockEvent);
        });

        it('should throw error when insert fails', async () => {
            vi.mocked(repo.insertEvent).mockResolvedValue(null as unknown as ChurchEvent);

            await expect(eventService.createEvent({
                church: 'church-1',
                mass: 'mass-1',
                date: '2024-03-20',
                code: 'M1',
                description: 'New Mass'
            })).rejects.toThrow('Failed to insert event');
        });
    });

    describe('insertEventUshers', () => {
        it('should insert event ushers successfully', async () => {
            const mockUshers: EventUsher[] = [
                {
                    id: '1',
                    event: 'event-1',
                    name: 'John Doe',
                    wilayah: 'wilayah-1',
                    lingkungan: 'lingkungan-1',
                    isPpg: true,
                    isKolekte: false,
                    position: null,
                    createdAt: 1710892800000
                }
            ];

            const createdDate = 1710892800000;
            vi.mocked(repo.persistEventUshers).mockResolvedValue(createdDate);

            const result = await eventService.assignEventUshers(
                'event-1',
                mockUshers,
                'wilayah-1',
                'lingkungan-1'
            );

            expect(repo.persistEventUshers).toHaveBeenCalledWith(
                'event-1',
                mockUshers,
                'wilayah-1',
                'lingkungan-1'
            );
            expect(result).toBe(createdDate);
        });

        it('should throw error when insert fails', async () => {
            const mockUshers: EventUsher[] = [
                {
                    id: '1',
                    event: 'event-1',
                    name: 'John Doe',
                    wilayah: 'wilayah-1',
                    lingkungan: 'lingkungan-1',
                    isPpg: true,
                    isKolekte: false,
                    position: null,
                    createdAt: 1710892800000
                }
            ];

            vi.mocked(repo.persistEventUshers).mockRejectedValue(new Error('db error'));

            await expect(eventService.assignEventUshers(
                'event-1',
                mockUshers,
                'wilayah-1',
                'lingkungan-1'
            )).rejects.toThrow('Sistem gagal mencatat petugas');
        });
    });

    describe('deactivateEvent', () => {
        it('should deactivate event successfully', async () => {
            vi.mocked(repo.deactivateEvent).mockResolvedValue(true);

            const result = await eventService.deactivateEvent('event-1');

            expect(repo.deactivateEvent).toHaveBeenCalledWith('event-1');
            expect(result).toBe(true);
        });
    });

    describe('removeEventUsher', () => {
        it('should remove event usher successfully', async () => {
            vi.mocked(repo.removeEventUsher).mockResolvedValue(true);

            const result = await eventService.removeUsherAssignment('event-1', 'lingkungan-1');

            expect(repo.removeEventUsher).toHaveBeenCalledWith('event-1', 'lingkungan-1');
            expect(result).toBe(true);
        });
    });

    describe('updateEventPic', () => {
        it('should call repo.updateEventPic with eventId, zoneGroupId, and name', async () => {
            vi.mocked(repo.updateEventPic).mockResolvedValue(true);

            await eventService.updateEventPic('event-1', 'zone-1', 'New Name');

            expect(repo.updateEventPic).toHaveBeenCalledWith('event-1', 'zone-1', 'New Name');
        });
    });
}); 