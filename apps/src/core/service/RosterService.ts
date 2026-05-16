import type {
	ConfirmRosterEntryCommand,
	CreateRosterCommand,
	Roster,
	RosterEntry,
	SubmitRosterEntryCommand
} from '$core/entities/Roster';
import type { RosterRepository } from '$core/repositories/RosterRepository';
import { ServiceError } from '$core/errors/ServiceError';

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

export class RosterService {
	constructor(private readonly repo: RosterRepository) {}

	async createRoster(cmd: CreateRosterCommand): Promise<Roster> {
		if (!cmd.eventId) throw ServiceError.validation('eventId is required');
		if (!cmd.createdByUserId) throw ServiceError.validation('createdByUserId is required');
		if (!cmd.communityIds.length)
			throw ServiceError.validation('at least one communityId is required');
		return this.repo.createRoster(cmd);
	}

	async loadRoster(eventId: string): Promise<Roster | null> {
		if (!eventId) throw ServiceError.validation('eventId is required');
		return this.repo.loadRoster(eventId);
	}

	async submitEntry(cmd: SubmitRosterEntryCommand): Promise<RosterEntry> {
		if (!cmd.rosterId) throw ServiceError.validation('rosterId is required');
		if (!cmd.communityId) throw ServiceError.validation('communityId is required');
		if (!cmd.ushers.length) throw ServiceError.validation('at least one usher is required');
		return this.repo.submitEntry(cmd);
	}

	async confirmEntry(cmd: ConfirmRosterEntryCommand): Promise<RosterEntry> {
		if (!cmd.rosterId) throw ServiceError.validation('rosterId is required');
		if (!cmd.communityId) throw ServiceError.validation('communityId is required');
		if (!cmd.confirmedByUserId) throw ServiceError.validation('confirmedByUserId is required');
		return this.repo.confirmEntry(cmd);
	}

	async reopenEntry(rosterId: string, communityId: string): Promise<RosterEntry> {
		if (!rosterId) throw ServiceError.validation('rosterId is required');
		if (!communityId) throw ServiceError.validation('communityId is required');
		return this.repo.reopenEntry(rosterId, communityId);
	}
}
