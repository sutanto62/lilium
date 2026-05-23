import { hasRole } from '$src/auth';
import { fail } from '@sveltejs/kit';

/**
 * Validates admin session and extracts churchId.
 * Throws form failures for missing session, non-admin role, or missing churchId.
 * @returns { ok, session, churchId, err } — check `ok` before using session/churchId
 */
export async function requireAdminSession(locals: App.Locals) {
	const session = await locals.auth();
	if (!session) {
		return {
			ok: false,
			session: null,
			churchId: null,
			err: fail(401, { error: 'Anda harus login' })
		};
	}

	if (!hasRole(session, 'admin')) {
		return {
			ok: false,
			session: null,
			churchId: null,
			err: fail(403, { error: 'Tidak ada izin' })
		};
	}

	const churchId = session.user?.cid;
	if (!churchId) {
		return {
			ok: false,
			session: null,
			churchId: null,
			err: fail(404, { error: 'Tidak ada gereja yang terdaftar' })
		};
	}

	return { ok: true, session, churchId, err: null };
}
