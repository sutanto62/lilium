// Extending the User interface to include cid (Church ID)
declare module '@auth/core/types' {
	interface User {
		cid?: string;
		role?: string;
		unregistered?: string;
	}
}
