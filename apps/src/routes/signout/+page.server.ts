import { signOut } from '$src/auth';
import type { Actions } from './$types';

export const actions = {
	default: signOut
} satisfies Actions;
