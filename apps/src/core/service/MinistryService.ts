import type { Ministry, MinistryRole } from '$core/entities/Ministry';
import type { MinistryRepository } from '$core/repositories/MinistryRepository';
import { ServiceError } from '$core/errors/ServiceError';
import { logger } from '$src/lib/utils/logger';

/**
 * Business logic for the Ministry catalog (Type Object pattern).
 * Pure service — no Drizzle imports, no HTTP concerns.
 * Callers inject a MinistryRepository (e.g. repo from db/index.ts).
 */
export class MinistryService {
	constructor(private readonly repo: MinistryRepository) {}

	/**
	 * List all active ministries ordered by name.
	 */
	async listMinistries(): Promise<Ministry[]> {
		try {
			return await this.repo.listMinistries();
		} catch (err) {
			logger.error('MinistryService.listMinistries: Failed', { err });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal mengambil data kementerian', { originalError: err });
		}
	}

	/**
	 * List all active roles for a given ministry.
	 */
	async listRolesByMinistry(ministryId: string): Promise<MinistryRole[]> {
		try {
			return await this.repo.listRolesByMinistry(ministryId);
		} catch (err) {
			logger.error('MinistryService.listRolesByMinistry: Failed', { err, ministryId });
			if (err instanceof ServiceError) throw err;
			throw ServiceError.unknown('Gagal mengambil data peran kementerian', { originalError: err });
		}
	}

	/**
	 * Resolve a ministry code + role code pair to a MinistryRole.
	 * Throws ServiceError.notFound when the code pair does not exist.
	 */
	async resolveRoleByCode(ministryCode: string, roleCode: string): Promise<MinistryRole> {
		try {
			const role = await this.repo.findRoleByCode(ministryCode, roleCode);
			if (!role) {
				throw ServiceError.notFound(
					`Peran kementerian tidak ditemukan: ${ministryCode}/${roleCode}`,
					{ ministryCode, roleCode }
				);
			}
			return role;
		} catch (err) {
			if (err instanceof ServiceError) throw err;
			logger.error('MinistryService.resolveRoleByCode: Failed', { err, ministryCode, roleCode });
			throw ServiceError.unknown('Gagal mencari peran kementerian', { originalError: err });
		} (feat(phase-7): feature-flag core roster and zone pages behind Statsig gates)
	}
}
