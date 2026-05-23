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
		logger.debug('MinistryService.listMinistries');
		try {
			const ministries = await this.repo.listMinistries();
			logger.debug('MinistryService.listMinistries: OK', { count: ministries.length });
			return ministries;
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
		logger.debug('MinistryService.listRolesByMinistry', { ministryId });
		try {
			const roles = await this.repo.listRolesByMinistry(ministryId);
			logger.debug('MinistryService.listRolesByMinistry: OK', { ministryId, count: roles.length });
			return roles;
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
		logger.debug('MinistryService.resolveRoleByCode', { ministryCode, roleCode });
		try {
			const role = await this.repo.findRoleByCode(ministryCode, roleCode);
			if (!role) {
				logger.warn('MinistryService.resolveRoleByCode: Not found', { ministryCode, roleCode });
				throw ServiceError.notFound(
					`Peran kementerian tidak ditemukan: ${ministryCode}/${roleCode}`,
					{ ministryCode, roleCode }
				);
			}
			logger.debug('MinistryService.resolveRoleByCode: OK', { ministryCode, roleCode, roleId: role.id });
			return role;
		} catch (err) {
			if (err instanceof ServiceError) throw err;
			logger.error('MinistryService.resolveRoleByCode: Failed', { err, ministryCode, roleCode });
			throw ServiceError.unknown('Gagal mencari peran kementerian', { originalError: err });
		}
	}
}
