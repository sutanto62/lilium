
export interface Event {
	id: string;
	church: string;
	churchCode?: string | null;
	mass: string;
	date: string;
	weekNumber: number | null;
	createdAt: number;
	isComplete: number; // 100% assigned ushers
	active: number;
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
	events: Event[];
}

export interface EventListDetailResponse {
	zone: string;
	pic: string[];
	zoneUshers: number;
	zonePpg: number;
	zoneKolekte: number;
	items: JadwalDetailZone[];
}

// formatted response: returned name instead of UUID
export interface UsherByEvent {
	id: string;
	event: string;
	name: string;
	zone: string | null;
	wilayah: string | null;
	lingkungan: string | null;
	isPpg: boolean | false;
	isKolekte: boolean | false;
	position: string | null;
	createdAt: number | null;
}

export interface JadwalDetailResponse {
	id: string;
	church: string | null;
	mass: string | null;
	date: string | null;
	rows: JadwalDetailZone[] | null;
}

export interface JadwalDetailZone {
	id: string;
	name: string | null;
	lingkungan: string[];
	pic: string[];
	zoneUshers: number;
	zonePpg: number;
	zoneKolekte: number;
	detail: JadwalDetailLingkungan[] | null;
}

export interface JadwalDetailLingkungan {
	name: string;
	zone: string;
	ushers: JadwalDetailUsher[];
}

export interface JadwalDetailUsher {
	name: string;
	position: string;
	isPpg: boolean;
	isKolekte: boolean;
}

// For printing
export interface CetakJadwalResponse {
	church: string | null;
	mass: string | null;
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
