export interface Country {
	value: string;
	name: string;
}

export interface Mass {
	id: string;
	code: string | null;
	name: string;
	sequence: number | null;
	church: string | null;
	day: string | 'sunday';
	time: string | null;
	briefingTime: string | null;
	active: number | 1;
}

export interface MassZone {
	id: string;
	mass: string;
	zone: string;
	active: number;
	sequence: number;
}

export interface Church {
	id: string;
	name: string;
	code: string;
	parish: string | null;
	active: number;
}

export interface ChurchZoneGroup {
	id: string;
	church: string;
	name: string;
	code: string | null;
	description: string | null;
	sequence: number | null;
	active: number;
}

export interface ChurchZone {
	id: string;
	church: string;
	group: string | null;
	name: string;
	code: string | null;
	description: string | null;
	sequence: number | null;
	active: number;
}

export interface ChurchPosition {
	id: string;
	church: string;
	zone: string;
	name: string;
	code: string | null;
	description: string | null;
	isPpg: boolean | false;
	sequence: number | null; // Sequence should be unique by church
	type: string;
	active: number;
}

export interface Wilayah {
	id: string;
	name: string;
	code: string | null;
	sequence: number | null;
	church: string | null;
	active: number;
}

export interface Lingkungan {
	id: string;
	name: string;
	wilayah: string | null;
	wilayahName: string | null;
	sequence: number | null;
	church: string | null;
	active: number;
}

export interface Usher {
	name: string;
	isPpg: boolean | false;
	isKolekte: boolean | false;
	sequence: number | null;
	validationMessage?: string;
}
