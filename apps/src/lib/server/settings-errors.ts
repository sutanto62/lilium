/**
 * Centralized error messages for settings pages.
 * Indonesian user-facing strings.
 */

export const VALIDATION_ERRORS = {
	NAME_REQUIRED: 'Nama wajib diisi',
	CODE_REQUIRED: 'Kode wajib diisi',
	SECTION_REQUIRED: 'Seksi wajib dipilih',
	ZONE_REQUIRED: 'Zona wajib dipilih',
	MINISTRY_REQUIRED: 'Pelayanan wajib dipilih',
	COMMUNITY_REQUIRED: 'Komunitas wajib dipilih',
	ID_NOT_FOUND: 'ID tidak ditemukan'
} as const;

export const OPERATION_ERRORS = {
	PARISH_CREATE: 'Gagal membuat paroki. Silakan coba lagi.',
	PARISH_UPDATE: 'Gagal mengubah paroki. Silakan coba lagi.',
	PARISH_DELETE: 'Gagal menghapus paroki. Silakan coba lagi.',

	CELEBRATION_CREATE: 'Gagal membuat perayaan. Silakan coba lagi.',
	CELEBRATION_UPDATE: 'Gagal mengubah perayaan. Silakan coba lagi.',
	CELEBRATION_DELETE: 'Gagal menghapus perayaan. Silakan coba lagi.',

	WILAYAH_CREATE: 'Gagal membuat wilayah. Silakan coba lagi.',
	WILAYAH_UPDATE: 'Gagal mengubah wilayah. Silakan coba lagi.',
	WILAYAH_DELETE: 'Gagal menghapus wilayah. Silakan coba lagi.',

	COMMUNITY_CREATE: 'Gagal membuat komunitas. Silakan coba lagi.',
	COMMUNITY_UPDATE: 'Gagal mengubah komunitas. Silakan coba lagi.',
	COMMUNITY_DELETE: 'Gagal menghapus komunitas. Silakan coba lagi.',

	CHURCH_CREATE: 'Gagal membuat gereja. Silakan coba lagi.',
	CHURCH_UPDATE: 'Gagal mengubah gereja. Silakan coba lagi.',
	CHURCH_DELETE: 'Gagal menghapus gereja. Silakan coba lagi.',

	SECTION_CREATE: 'Gagal membuat seksi. Silakan coba lagi.',
	SECTION_UPDATE: 'Gagal mengubah seksi. Silakan coba lagi.',
	SECTION_DELETE: 'Gagal menghapus seksi. Silakan coba lagi.',

	ZONE_CREATE: 'Gagal membuat zona. Silakan coba lagi.',
	ZONE_UPDATE: 'Gagal mengubah zona. Silakan coba lagi.',
	ZONE_DELETE: 'Gagal menghapus zona. Silakan coba lagi.',

	STATION_CREATE: 'Gagal membuat titik tugas. Silakan coba lagi.',
	STATION_UPDATE: 'Gagal mengubah titik tugas. Silakan coba lagi.',
	STATION_DELETE: 'Gagal menghapus titik tugas. Silakan coba lagi.',

	REORDER_FAILED: 'Gagal menyimpan urutan. Silakan coba lagi.',
	MOVE_FAILED: 'Gagal memindahkan item. Silakan coba lagi.',

	NOT_FOUND: 'Item tidak ditemukan'
} as const;
