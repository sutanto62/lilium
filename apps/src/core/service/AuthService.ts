import { repo } from '$src/lib/server/db';
import type { User } from '$core/entities/Authentication';

export class AuthService {
    churchId: string;

    constructor(churchId: string) {
        this.churchId = churchId;
    }

    async getUsers(): Promise<User[]> {
        return await repo.findUsersByChurch(this.churchId);
    }
}