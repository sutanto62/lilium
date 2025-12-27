
export interface ChurchEvent {
	id: string;
	church: string;
	churchCode?: string | null;
	mass: string;
	massId?: string | null;
	date: string;
	weekNumber?: number | null;
	createdAt?: number | null;
	isComplete?: number | null; // 100% assigned ushers
	active?: number | null;
	type?: EventType | null;
	code?: string | null;
	description?: string | null;
}

export interface ChurchEventResponse {
	id: string;
	church: string;
	churchCode?: string | null;
	mass: string;
	date: string;
	weekNumber?: number | null;
	createdAt?: number | null;
	isComplete?: number | null; // 100% assigned ushers
	active?: number | null;
	type?: EventType | null;
	code?: string | null;
	description?: string | null;
}

export enum EventType {
	MASS = 'mass',
	FEAST = 'feast'
}

export interface EventUsher {
	id: string;
	event: string;
	name: string;
	wilayah: string;
	lingkungan: string;
	isPpg: boolean | false;
	isKolekte: boolean | false;
	position: string | null;
	createdAt: number;
}

export interface EventPicRequest {
	event: string;
	zone: string;
	name: string;
}

export interface EventListResponse {
	events: ChurchEvent[];
}

export interface EventListDetailResponse {
	zone: string;
	pic: string[];
	zoneUshers: number;
	zonePpg: number;
	zoneKolekte: number;
	items: EventScheduleRows[];
}

export interface EventScheduleResponse {
	id: string;
	church: string | null;
	mass: string | null;
	date: string | null;
	description: string | null;
	rows: EventScheduleRows[] | null;
}

export interface EventScheduleRows {
	id: string;
	name: string | null;
	wilayah: string;
	lingkungan: string[];
	pic: string[];
	zoneUshers: number;
	zonePpg: number;
	zoneKolekte: number;
	detail: EventScheduleLingkungan[] | null;
}

export interface EventScheduleLingkungan {
	name: string;
	wilayah: string;
	zone: string;
	id: string;
	ushers: EventScheduleLingkunganUsher[];
}

export interface EventScheduleLingkunganUsher {
	name: string;
	position: string;
	isPpg: boolean;
	isKolekte: boolean;
}

// For printing
export interface CetakJadwalResponse {
	church: string | null;
	mass: string | null;
	pic: string | null;
	date: string | null;
	weekday: string | null;
	time: string | null;
	briefingTime: string | null;
	listUshers: CetakJadwalSection[];
	listKolekte: CetakJadwalSection[];
	listPpg: CetakJadwalSection[];
}

export interface CetakJadwalSection {
	zone: string;
	pic: string;
	rowSpan: number;
	ushers: CetakJadwalUsher[];
}

export interface CetakJadwalUsher {
	position: string;
	sequence: number;
	name: string;
	wilayah: string;
	lingkungan: string;
}
