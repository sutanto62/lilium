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
		logger.debug('RosterService.loadRoster', { eventId });
		try {
			const roster = await this.repo.loadRoster(eventId);
			logger.debug('RosterService.loadRoster: OK', { eventId, found: !!roster, entries: roster?.entries.length ?? 0 });
			return roster;
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

		logger.debug('RosterService.createRoster', { eventId: cmd.eventId, communityCount: cmd.communityIds.length });
		try {
			const roster = await this.repo.createRoster(cmd);
			logger.info('RosterService.createRoster: OK', { rosterId: roster.id, eventId: cmd.eventId });
			return roster;
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

		logger.debug('RosterService.submitEntry', { rosterId: cmd.rosterId, communityId: cmd.communityId, usherCount: cmd.ushers.length });
		try {
			const entry = await this.repo.submitEntry(cmd);
			logger.info('RosterService.submitEntry: draft→submitted', { rosterId: cmd.rosterId, communityId: cmd.communityId, entryId: entry.id });
			return entry;
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

		logger.debug('RosterService.confirmEntry', { rosterId: cmd.rosterId, communityId: cmd.communityId, confirmedBy: cmd.confirmedByUserId });
		try {
			const entry = await this.repo.confirmEntry(cmd);
			logger.info('RosterService.confirmEntry: submitted→confirmed', { rosterId: cmd.rosterId, communityId: cmd.communityId, entryId: entry.id, confirmedBy: cmd.confirmedByUserId });
			return entry;
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

		logger.debug('RosterService.reopenEntry', { rosterId, communityId });
		try {
			const entry = await this.repo.reopenEntry(rosterId, communityId);
			logger.info('RosterService.reopenEntry: →draft', { rosterId, communityId, entryId: entry.id, previousStatus: entry.status });
			return entry;
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
		logger.debug('RosterService.listByCommunity', { communityId });
		try {
			const rosters = await this.repo.listByCommunity(communityId);
			logger.debug('RosterService.listByCommunity: OK', { communityId, count: rosters.length });
			return rosters;
		} catch (err) {
			logger.error('RosterService.listByCommunity: Failed', { err, communityId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal mengambil riwayat roster', { originalError: err });
		}
	}
}
