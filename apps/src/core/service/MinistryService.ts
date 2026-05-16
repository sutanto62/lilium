import type { Ministry, MinistryRole } from '$core/entities/Ministry';
import type { MinistryRepository } from '$core/repositories/MinistryRepository';
import { ServiceError } from '$core/errors/ServiceError';

export class MinistryService {
	constructor(private readonly repo: MinistryRepository) {}

	async listMinistries(): Promise<Ministry[]> {
		return this.repo.listMinistries();
	}

	async resolveRoleByCode(ministryCode: string, roleCode: string): Promise<MinistryRole> {
		if (!ministryCode || !roleCode) {
			throw ServiceError.validation('ministryCode and roleCode are required', {
				ministryCode,
				roleCode
			});
		}
		const role = await this.repo.findRoleByCode(ministryCode, roleCode);
		if (!role) {
			throw ServiceError.notFound(
				`MinistryRole not found: ${ministryCode}/${roleCode}`,
				{ ministryCode, roleCode }
			);
		}
		return role;
	}
}
