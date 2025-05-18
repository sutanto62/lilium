// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { Event } from '$core/entities/Event';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			church: Church;
			wilayahs: Wilayah[];
			lingkungans: Lingkungan[];
			events: Event[];
			eventsDate;
			success: boolean;
			assignedUshers: never[];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
