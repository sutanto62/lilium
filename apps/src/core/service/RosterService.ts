import type {
	ConfirmRosterEntryCommand,
	CreateRosterCommand,
	Roster,
	RosterEntry,
	SubmitRosterEntryCommand
} from '$core/entities/Roster';
import type { RosterRepository } from '$core/repositories/RosterRepository';
import { ServiceError } from '$core/errors/ServiceError';
import { logger } from '$src/lib/utils/logger';

// ─── State machine ─────────────────────────────────────────────────────────────

type RosterTransition = 'submit' | 'confirm' | 'reopen';

const VALID_TRANSITIONS: Readonly<Record<string, readonly RosterTransition[]>> = {
	draft: ['submit'],
	submitted: ['confirm', 'reopen'],
	confirmed: ['reopen']
};

/**
 * Pure function: apply a state-machine transition to a RosterEntry.
 * Throws ServiceError.validation for invalid transitions (e.g. confirm a draft).
 * Has no I/O — callers that need persistence must call the repository directly.
 */
export function applyTransition(entry: RosterEntry, transition: RosterTransition): RosterEntry {
	const allowed = VALID_TRANSITIONS[entry.status] ?? [];
	if (!(allowed as readonly string[]).includes(transition)) {
		throw ServiceError.validation(
			`Invalid transition '${transition}' from status '${entry.status}'`,
			{ currentStatus: entry.status, transition, allowed }
		);
	}

	const now = Math.floor(Date.now() / 1000);
	switch (transition) {
		case 'submit':
			return { ...entry, status: 'submitted', submittedAt: now };
		case 'confirm':
			return { ...entry, status: 'confirmed', confirmedAt: now };
		case 'reopen':
			return {
				...entry,
				status: 'draft',
				submittedAt: null,
				confirmedAt: null,
				confirmedByUserId: null,
				ushers: []
			};
	}
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Business logic for the Roster aggregate (lifecycle + state transitions).
 * Pure service — no Drizzle imports, no HTTP concerns.
 * Callers inject a RosterRepository (e.g. repo from db/index.ts).
 *
 * State machine enforced here (duplicate of adapter-level guard — belt-and-suspenders):
 *   draft → submitted  (submitEntry)
 *   submitted → confirmed  (confirmEntry)
 *   submitted | confirmed → draft  (reopenEntry)
 */
export class RosterService {
	constructor(private readonly repo: RosterRepository) {}

	/**
	 * Load the full Roster aggregate for an event.
	 * Returns null when no roster has been created for this event yet.
	 */
	async loadRoster(eventId: string): Promise<Roster | null> {
		try {
			return await this.repo.loadRoster(eventId);
		} catch (err) {
			logger.error('RosterService.loadRoster: Failed', { err, eventId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal memuat roster', { originalError: err });
		}
	}

	/**
	 * Create a new Roster for an event.
	 * Validates required fields before delegating to the repository.
	 */
	async createRoster(cmd: CreateRosterCommand): Promise<Roster> {
		if (!cmd.eventId) throw ServiceError.validation('Event ID wajib diisi', { field: 'eventId' });
		if (!cmd.createdByUserId) {
			throw ServiceError.validation('User ID wajib diisi', { field: 'createdByUserId' });
		}
		if (!cmd.communityIds.length) {
			throw ServiceError.validation('Minimal satu komunitas harus dipilih', {
				field: 'communityIds'
			});
		}

		try {
			return await this.repo.createRoster(cmd);
		} catch (err) {
			logger.error('RosterService.createRoster: Failed', { err, eventId: cmd.eventId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal membuat roster', { originalError: err });
		}
	}

	/**
	 * Submit usher names for a community's entry (draft → submitted).
	 * Validates required fields; adapter enforces the state guard transactionally.
	 */
	async submitEntry(cmd: SubmitRosterEntryCommand): Promise<RosterEntry> {
		if (!cmd.rosterId) throw ServiceError.validation('Roster ID wajib diisi', { field: 'rosterId' });
		if (!cmd.communityId) {
			throw ServiceError.validation('Community ID wajib diisi', { field: 'communityId' });
		}
		if (!cmd.ushers.length) {
			throw ServiceError.validation('Minimal satu petugas harus diisi', { field: 'ushers' });
		}

		try {
			return await this.repo.submitEntry(cmd);
		} catch (err) {
			logger.error('RosterService.submitEntry: Failed', { err, rosterId: cmd.rosterId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal menyimpan konfirmasi petugas', { originalError: err });
		}
	}

	/**
	 * Confirm a community's submitted usher list (submitted → confirmed).
	 * Validates required fields; adapter enforces the state guard transactionally.
	 */
	async confirmEntry(cmd: ConfirmRosterEntryCommand): Promise<RosterEntry> {
		if (!cmd.rosterId) throw ServiceError.validation('Roster ID wajib diisi', { field: 'rosterId' });
		if (!cmd.communityId) {
			throw ServiceError.validation('Community ID wajib diisi', { field: 'communityId' });
		}
		if (!cmd.confirmedByUserId) {
			throw ServiceError.validation('User ID konfirmator wajib diisi', {
				field: 'confirmedByUserId'
			});
		}

		try {
			return await this.repo.confirmEntry(cmd);
		} catch (err) {
			logger.error('RosterService.confirmEntry: Failed', { err, rosterId: cmd.rosterId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal mengkonfirmasi petugas', { originalError: err });
		}
	}

	/**
	 * Reopen a submitted or confirmed entry back to draft.
	 * Clears ushers and resets timestamps; adapter enforces the guard.
	 */
	async reopenEntry(rosterId: string, communityId: string): Promise<RosterEntry> {
		if (!rosterId) throw ServiceError.validation('Roster ID wajib diisi', { field: 'rosterId' });
		if (!communityId) {
			throw ServiceError.validation('Community ID wajib diisi', { field: 'communityId' });
		}

		try {
			return await this.repo.reopenEntry(rosterId, communityId);
		} catch (err) {
			logger.error('RosterService.reopenEntry: Failed', { err, rosterId, communityId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal membuka kembali entri', { originalError: err });
		}
	}

	/**
	 * List all rosters for a community (history view).
	 */
	async listByCommunity(communityId: string): Promise<Roster[]> {
		try {
			return await this.repo.listByCommunity(communityId);
		} catch (err) {
			logger.error('RosterService.listByCommunity: Failed', { err, communityId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal mengambil riwayat roster', { originalError: err });
		}
	}
}
