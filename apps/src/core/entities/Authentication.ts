// Extending the User interface to include cid (Church ID)
declare module '@auth/core/types' {
	interface User {
		cid?: string; // church id
		role?: string;
		lingkunganId?: string;
		unregistered?: string;
	}
}

export interface User {
	id?: string;
	name?: string;
	email?: string;
	cid?: string;
	image?: string;
	role?: string;
	churchId?: string;
	lingkunganId?: string;
}
