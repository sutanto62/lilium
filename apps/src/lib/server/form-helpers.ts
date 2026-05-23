/**
 * Parse string form fields with trim and null-coalescing.
 * @param fd FormData object
 * @param fields Field names to extract
 * @returns Object with parsed field values (null if empty)
 */
export function parseFormFields(
	fd: FormData,
	fields: string[]
): Record<string, string | null> {
	return Object.fromEntries(
		fields.map((field) => [
			field,
			(fd.get(field) as string)?.trim() || null
		])
	);
}

/**
 * Parse a numeric form field.
 * @param fd FormData object
 * @param field Field name
 * @returns Number or null if not provided / invalid
 */
export function parseNumericField(
	fd: FormData,
	field: string
): number | null {
	const val = fd.get(field) as string;
	if (!val) return null;
	const num = Number(val);
	return isNaN(num) ? null : num;
}

/**
 * Parse a JSON array field (e.g., for reorder IDs).
 * @param fd FormData object
 * @param field Field name
 * @returns Parsed array or null if invalid
 */
export function parseJsonField<T>(
	fd: FormData,
	field: string
): T | null {
	const val = fd.get(field) as string;
	if (!val) return null;
	try {
		return JSON.parse(val) as T;
	} catch {
		return null;
	}
}
