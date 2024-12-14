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
}

export interface MassZone {
	id: string;
	mass: string;
	zone: string;
	isActive: boolean;
	sequence: number;
}

export interface Church {
	id: string;
	name: string;
	code: string;
	parish: string | null;
}

export interface ChurchZone {
	id: string;
	church: string;
	name: string;
	code: string | null;
	description: string | null;
	sequence: number | null;
	pic: string | null;
}

export interface ChurchPosition {
	id: string;
	church: string;
	name: string;
	code: string | null;
	description: string | null;
	sequence: number | null;
	type: string;
}

export interface Wilayah {
	id: string;
	name: string;
	code: string | null;
	sequence: number | null;
	church: string | null;
}

export interface Lingkungan {
	id: string;
	name: string;
	wilayah: string | null;
	sequence: number | null;
	church: string | null;
}

export interface Usher {
	name: string;
	isPpg: boolean | false;
	isKolekte: boolean | false;
	sequence: number | null;
}
