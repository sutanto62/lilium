import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import type { ParishRepository } from '$core/repositories/ParishRepository';
import type { FacilityRepository } from '$core/repositories/FacilityRepository';
import type { MinistryRepository } from '$core/repositories/MinistryRepository';
import type { RosterRepository } from '$core/repositories/RosterRepository';
import { drizzle } from 'drizzle-orm/libsql';
import {
	createEvent,
	createEventPic,
	updateEventPic as updateEventPicDb,
	deleteEventUsher,
	editEventUshers,
	findCetakJadwal,
	findEvent,
	findEventByChurch,
	findEventById,
	findEventByIdResponse,
	findEventRawById,
	findEventSchedule,
	findEventUshers,
	findEventUshersPosition,
	listEvents,
	listEventsByDateRange,
	listEventsByLingkungan,
	listEventsByWeekNumber,
	listUsherByEvent,
	listUsherByLingkungan,
	persistEventUsher,
	softDeleteEvent,
	updateEventById
} from './SQLiteDbEvent';
import {
	createMassZone as createMassZoneDb,
	createPosition,
	createZone as createZoneDb,
	createZoneGroup as createZoneGroupDb,
	deactivateMassZone as deactivateMassZoneDb,
	deactivateZone as deactivateZoneDb,
	deactivateZoneGroup as deactivateZoneGroupDb,
	findChurchById,
	findChurches,
	findMassZonesByChurch,
	findPositionByChurch,
	findZoneGroupsByEvent,
	findZonesByChurch,
	findZonesByEvent,
	findZonesByMass,
	listPositionByMass,
	listZoneGroups as listZoneGroupsDb,
	reorderZonePositions,
	softDeletePosition,
	updatePosition,
	updateZone as updateZoneDb,
	updateZoneGroup as updateZoneGroupDb
} from './SQLiteDbFacility';
import {
	createMass as createMassDb,
	deactivateMass as deactivateMassDb,
	findMassById,
	findMasses,
	updateMass as updateMassDb
} from './SQLiteDbMass';
import {
	findLingkunganById,
	listLingkunganByChurch,
	listWilayahByChurch,
	findParishHierarchy,
	listCommunities,
	findCommunityById,
	listWilayahsByParish,
	listCommunitiesByWilayah
} from './SQLiteDbRegion';
import {
	listSectionsByChurch,
	listZonesByChurch,
	listNewZonesByEvent,
	listStationsByZone,
	findChurchFacility,
	createSection,
	updateSection,
	deactivateSection,
	createNewZone,
	updateNewZone,
	deactivateNewZone,
	createStation,
	updateStation,
	deactivateStation
} from './SQLiteDbFacility';
import {
	listMinistries,
	listRolesByMinistry,
	findRoleByCode,
	findMinistryByCode
} from './SQLiteDbMinistry';
import {
	createRoster,
	loadRoster,
	findRosterById,
	submitEntry,
	confirmEntry,
	reopenEntry,
	listByCommunity
} from './SQLiteDbRoster';

import type { ChurchEvent, EventPicRequest, EventUsher } from '$core/entities/Event';
import type { Church, ChurchZone, ChurchZoneGroup, Lingkungan } from '$core/entities/Schedule';
import { findUserByEmail, findUsersByChurch, updateUserFeaturePreference } from './SQLiteDbUser';

// Adapter
// It is used to abstract the database implementation.
// Future implementation can be changed to different database type.
// For example, PostgreSQL, MySQL, etc.

export class SQLiteAdapter
	implements ScheduleRepository, ParishRepository, FacilityRepository, MinistryRepository, RosterRepository {
	private db: ReturnType<typeof drizzle>;

	constructor(db: ReturnType<typeof drizzle>) {
		this.db = db;
	}
	findEventByIdResponse = (id: string) => findEventRawById(this.db, id);

	// SQLiteDbRegion
	listWilayahByChurch = (churchId: string) => listWilayahByChurch(this.db, churchId);
	listLingkunganByChurch = (churchId: string) => listLingkunganByChurch(this.db, churchId);
	findLingkunganById = (id: string): Promise<Lingkungan> => findLingkunganById(this.db, id);

	// SQLiteDbMass
	getMasses = (churchId: string) => findMasses(this.db, churchId);
	getMassById = (id: string) => findMassById(this.db, id);
	deactivateMass = (massId: string) => deactivateMassDb(this.db, massId);
	createMass = (input: Omit<import('$core/entities/Schedule').Mass, 'id'>) => createMassDb(this.db, input);
	updateMass = (massId: string, patch: Partial<Omit<import('$core/entities/Schedule').Mass, 'id' | 'church'>>) => updateMassDb(this.db, massId, patch);

	// SQLiteDbEvents
	getEventByChurch = (churchId: string, massId: string, date: string) =>
		findEventByChurch(this.db, churchId, massId, date);
	listPositionByMass = (churchId: string, massId: string) =>
		listPositionByMass(this.db, churchId, massId);
	getEventById = (id: string) => findEventById(this.db, id);
	updateEventById = (id: string, event: ChurchEvent) => updateEventById(this.db, id, event);
	listEvents = (churchId: string, limit?: number) => listEvents(this.db, churchId, limit);
	listEventsByWeekNumber = (churchId: string, weekNumber: number[], isToday: boolean, limit?: number) =>
		listEventsByWeekNumber(this.db, churchId, weekNumber, isToday, limit);
	listEventsByDateRange = (churchId: string, startDate: string, endDate: string) =>
		listEventsByDateRange(this.db, churchId, startDate, endDate);
	listEventsByLingkungan = (churchId: string, lingkunganId: string, all?: boolean) =>
		listEventsByLingkungan(this.db, churchId, lingkunganId, all);


	findEventSchedule = (eventId: string) => findEventSchedule(this.db, eventId);
	deactivateEvent = (eventId: string) => softDeleteEvent(this.db, eventId);

	insertEvent = (event: ChurchEvent) =>
		createEvent(this.db, event);
	createEventPic = (request: EventPicRequest) => createEventPic(this.db, request);
	updateEventPic = (eventId: string, zoneGroupId: string, name: string) =>
		updateEventPicDb(this.db, eventId, zoneGroupId, name);

	editEventUshers = (eventUshers: EventUsher[]) => editEventUshers(this.db, eventUshers);
	findEvent = (churchId: string, massId?: string, date?: string) =>
		findEvent(this.db, churchId, massId, date);
	findEventById = (id: string) => findEventByIdResponse(this.db, id);
	findCetakJadwal = (eventId: string) => findCetakJadwal(this.db, eventId);
	removeEventUsher = (eventId: string, lingkunganId: string) => deleteEventUsher(this.db, eventId, lingkunganId);

	// Ushers
	listUsherByEvent = (eventId: string) => listUsherByEvent(this.db, eventId);
	findEventUshers = (eventId: string, lingkunganId?: string, date?: string) =>
		findEventUshers(this.db, eventId, lingkunganId, date);
	listUsherByLingkungan = (eventId: string, lingkunganId: string) =>
		listUsherByLingkungan(this.db, eventId, lingkunganId);
	getEventUshersPosition = (eventId: string, isPpg: boolean): Promise<string[]> =>
		findEventUshersPosition(this.db, eventId, isPpg);
	persistEventUshers = (
		eventId: string,
		ushers: EventUsher[],
		wilayahId: string,
		lingkunganId: string
	) => persistEventUsher(this.db, eventId, ushers, wilayahId, lingkunganId);


	// SQLiteDbFacility
	getChurches = () => findChurches(this.db);
	findChurchById = (id: string): Promise<Church> => findChurchById(this.db, id);

	getZones = (id: string): Promise<ChurchZone[]> => findZonesByChurch(this.db, id);
	getZonesByEvent = (churchId: string, eventId: string) => findZonesByEvent(this.db, churchId, eventId);
	getZonesByMass = (churchId: string, massId: string) => findZonesByMass(this.db, churchId, massId);
	findZoneGroupsByEvent = (churchId: string, eventId: string) => findZoneGroupsByEvent(this.db, churchId, eventId);
	listZoneGroups = (churchId: string) => listZoneGroupsDb(this.db, churchId);
	createZoneGroup = (input: Omit<ChurchZoneGroup, 'id'>) => createZoneGroupDb(this.db, input);
	updateZoneGroup = (id: string, patch: Partial<Omit<ChurchZoneGroup, 'id' | 'church'>>) => updateZoneGroupDb(this.db, id, patch);
	deactivateZoneGroup = (id: string) => deactivateZoneGroupDb(this.db, id);
	createZone = (input: Omit<ChurchZone, 'id'>) => createZoneDb(this.db, input);
	updateZone = (zoneId: string, patch: Partial<Omit<ChurchZone, 'id' | 'church'>>) => updateZoneDb(this.db, zoneId, patch);
	deactivateZone = (zoneId: string) => deactivateZoneDb(this.db, zoneId);
	getMassZones = (churchId: string) => findMassZonesByChurch(this.db, churchId);
	createMassZone = (massId: string, zoneId: string) => createMassZoneDb(this.db, massId, zoneId);
	deactivateMassZone = (massZoneId: string) => deactivateMassZoneDb(this.db, massZoneId);
	findPositionByChurch = (id: string) => findPositionByChurch(this.db, id);
	createPosition = (position: Omit<import('$core/entities/Schedule').ChurchPosition, 'id' | 'church' | 'active'> & { zone: string }) =>
		createPosition(this.db, position);
	updatePosition = (positionId: string, patch: Partial<Pick<import('$core/entities/Schedule').ChurchPosition, 'name' | 'code' | 'description' | 'type' | 'isPpg'>>) =>
		updatePosition(this.db, positionId, patch);
	softDeletePosition = (positionId: string) => softDeletePosition(this.db, positionId);
	reorderZonePositions = (zoneId: string, items: { id: string; sequence: number }[]) =>
		reorderZonePositions(this.db, zoneId, items);

	// Authentication
	getUserByEmail = (email: string) => findUserByEmail(this.db, email);
	getUsers = (churchId: string) => findUsersByChurch(this.db, churchId);
	findUsersByChurch = (churchId: string) => findUsersByChurch(this.db, churchId);
	updateUserFeaturePreference = (email: string, preference: string | null) =>
		updateUserFeaturePreference(this.db, email, preference);

	// Report
	// findUshersByEvent = (eventId: string, date: string) => findUshersByEvent(this.db, eventId, date)dd

	// ── ParishRepository ────────────────────────────────────────────────────────
	findParishHierarchy = (parishId: string) => findParishHierarchy(this.db, parishId);
	listCommunities = (parishId: string) => listCommunities(this.db, parishId);
	findCommunityById = (id: string) => findCommunityById(this.db, id);
	listWilayahsByParish = (parishId: string) => listWilayahsByParish(this.db, parishId);
	listCommunitiesByWilayah = (wilayahId: string) => listCommunitiesByWilayah(this.db, wilayahId);

	// ── FacilityRepository ──────────────────────────────────────────────────────
	findChurchFacility = (churchId: string) => findChurchFacility(this.db, churchId);
	listSectionsByChurch = (churchId: string) => listSectionsByChurch(this.db, churchId);
	listZonesByChurch = (churchId: string, sectionId?: string) =>
		listZonesByChurch(this.db, churchId, sectionId);
	listZonesByEvent = (eventId: string) => listNewZonesByEvent(this.db, eventId);
	listStationsByZone = (zoneId: string) => listStationsByZone(this.db, zoneId);
	createSection = (input: Omit<import('$core/entities/Facility').Section, 'id'>) =>
		createSection(this.db, input);
	updateSection = (id: string, patch: Partial<Pick<import('$core/entities/Facility').Section, 'name' | 'code' | 'description' | 'sequence'>>) =>
		updateSection(this.db, id, patch);
	deactivateSection = (id: string) => deactivateSection(this.db, id);
	createNewZone = (input: Omit<import('$core/entities/Facility').Zone, 'id'>) =>
		createNewZone(this.db, input);
	updateNewZone = (id: string, patch: Partial<Pick<import('$core/entities/Facility').Zone, 'name' | 'code' | 'description' | 'sequence' | 'sectionId'>>) =>
		updateNewZone(this.db, id, patch);
	deactivateNewZone = (id: string) => deactivateNewZone(this.db, id);
	createStation = (input: Omit<import('$core/entities/Facility').Station, 'id'>) =>
		createStation(this.db, input);
	updateStation = (id: string, patch: Partial<Pick<import('$core/entities/Facility').Station, 'name' | 'code' | 'description' | 'sequence' | 'zoneId' | 'ministryId' | 'defaultRoleId'>>) =>
		updateStation(this.db, id, patch);
	deactivateStation = (id: string) => deactivateStation(this.db, id);

	// ── MinistryRepository ──────────────────────────────────────────────────────
	listMinistries = () => listMinistries(this.db);
	listRolesByMinistry = (ministryId: string) => listRolesByMinistry(this.db, ministryId);
	findRoleByCode = (ministryCode: string, roleCode: string) =>
		findRoleByCode(this.db, ministryCode, roleCode);
	findMinistryByCode = (code: string) => findMinistryByCode(this.db, code);

	// ── RosterRepository ────────────────────────────────────────────────────────
	createRoster = (cmd: import('$core/entities/Roster').CreateRosterCommand) =>
		createRoster(this.db, cmd);
	loadRoster = (eventId: string) => loadRoster(this.db, eventId);
	findRosterById = (rosterId: string) => findRosterById(this.db, rosterId);
	submitEntry = (cmd: import('$core/entities/Roster').SubmitRosterEntryCommand) =>
		submitEntry(this.db, cmd);
	confirmEntry = (cmd: import('$core/entities/Roster').ConfirmRosterEntryCommand) =>
		confirmEntry(this.db, cmd);
	reopenEntry = (rosterId: string, communityId: string) =>
		reopenEntry(this.db, rosterId, communityId);
	listByCommunity = (communityId: string) => listByCommunity(this.db, communityId);
}

