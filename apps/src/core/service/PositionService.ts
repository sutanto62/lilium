import type { ChurchPosition, MassPositionView } from '$core/entities/Schedule';
import { ServiceError } from '$core/errors/ServiceError';
import type { ScheduleRepository } from '$core/repositories/ScheduleRepository';
import { repo } from '$src/lib/server/db';

export interface CreatePositionInput {
	name: string;
	type: 'usher' | 'prodiakon' | 'peta';
	code?: string | null;
	description?: string | null;
	isPpg?: boolean;
	sequence?: number | null;
}

export interface UpdatePositionInput {
	name?: string;
	code?: string | null;
	description?: string | null;
	type?: 'usher' | 'prodiakon' | 'peta';
	isPpg?: boolean;
	sequence?: number | null;
	zone?: string;
}

export class PositionService {
	private churchId: string;
	private repository: ScheduleRepository;

	constructor(churchId: string, repository: ScheduleRepository = repo) {
		this.churchId = churchId;
		this.repository = repository;
	}

	async retrievePositionsByMass(massId: string): Promise<MassPositionView[]> {
		if (!massId) {
			throw ServiceError.validation('Mass ID is required', { field: 'massId' });
		}

		const positions = await this.repository.listPositionByMass(this.churchId, massId);

		// Type assertion to access extended fields from adapter
		type PositionWithZoneInfo = ChurchPosition & {
			_zoneId?: string;
			_zoneName?: string;
			_zoneGroupId?: string | null;
			_zoneGroupName?: string | null;
			_zoneGroupSequence?: number | null;
		};

		return positions.map((position) => {
			const pos = position as PositionWithZoneInfo;
			return {
				massId,
				zoneId: pos._zoneId ?? '', // Adapter should always provide _zoneId
				zoneName: pos._zoneName ?? pos.zone, // Fallback to zone (name) if _zoneName not available
				zoneGroupId: pos._zoneGroupId ?? null,
				zoneGroupName: pos._zoneGroupName ?? null,
				zoneGroupSequence: pos._zoneGroupSequence ?? null,
				positionId: pos.id,
				positionName: pos.name,
				positionType: pos.type as 'usher' | 'prodiakon' | 'peta',
				isPpg: pos.isPpg,
				positionSequence: pos.sequence,
				positionActive: pos.active
			};
		});
	}

	async createPositionForMass(
		massId: string,
		zoneId: string,
		input: CreatePositionInput
	): Promise<ChurchPosition> {
		if (!massId) {
			throw ServiceError.validation('Mass ID is required', { field: 'massId' });
		}
		if (!zoneId) {
			throw ServiceError.validation('Zone ID is required', { field: 'zoneId' });
		}
		if (!input.name) {
			throw ServiceError.validation('Nama posisi wajib diisi', { field: 'name' });
		}
		if (!input.type) {
			throw ServiceError.validation('Tipe posisi wajib diisi', { field: 'type' });
		}

		// TODO: Add validation that:
		// - Mass exists, active, and belongs to current church
		// - Zone exists, active, belongs to same church, and is assigned to mass via mass_zone

		const position = await this.repository.createPosition({
			zone: zoneId,
			name: input.name,
			type: input.type,
			code: input.code ?? null,
			description: input.description ?? null,
			isPpg: input.isPpg ?? false,
			sequence: input.sequence ?? null
		});

		return position;
	}

	async editPosition(positionId: string, patch: UpdatePositionInput): Promise<ChurchPosition> {
		if (!positionId) {
			throw ServiceError.validation('Position ID is required', { field: 'positionId' });
		}

		if (Object.keys(patch).length === 0) {
			throw ServiceError.validation('Tidak ada perubahan posisi', { field: 'patch' });
		}

		const updated = await this.repository.updatePosition(positionId, patch);
		return updated;
	}

	async deactivatePosition(positionId: string): Promise<void> {
		if (!positionId) {
			throw ServiceError.validation('Position ID is required', { field: 'positionId' });
		}

		await this.repository.softDeletePosition(positionId);
	}

	async reorderZonePositions(
		zoneId: string,
		items: { id: string; sequence: number }[]
	): Promise<void> {
		if (!zoneId) {
			throw ServiceError.validation('Zone ID is required', { field: 'zoneId' });
		}

		if (!items || items.length === 0) {
			throw ServiceError.validation('Daftar urutan posisi tidak boleh kosong', { field: 'items' });
		}

		await this.repository.reorderZonePositions(zoneId, items);
	}
}

