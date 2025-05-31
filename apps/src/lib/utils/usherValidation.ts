import type { EventUsher } from '$core/entities/Event';

export function validateUsherNames(ushers: EventUsher[]): { isValid: boolean; error?: string } {
    const usherNames = ushers.map(u => u.name);
    const uniqueNames = new Set(usherNames);

    if (uniqueNames.size !== usherNames.length) {
        const duplicates = usherNames.filter((item, index) => usherNames.indexOf(item) !== index);
        return { isValid: false, error: `Nama petugas tidak boleh duplikat: ${duplicates.join(', ')}` };
    }

    for (const name of usherNames) {
        if (name.length < 3 || name.length > 50) {
            return { isValid: false, error: `Panjang nama petugas minimum 3/maksimum 50 karakter: ${name}` };
        }

        if (/(.)\1{2,}/.test(name)) {
            return { isValid: false, error: `Mohon ketik nama petugas dengan benar: ${name}` };
        }

        if (!/^[a-zA-Z\s]+$/.test(name)) {
            return { isValid: false, error: `Nama petugas hanya boleh mengandung huruf: ${name}` };
        }

        if (name.includes('.')) {
            return { isValid: false, error: `Nama petugas tidak boleh mengandung titik: ${name}` };
        }

        // Check for single character words (abbreviations)
        const words = name.trim().split(/\s+/);
        if (words.some(word => word.length === 1)) {
            return { isValid: false, error: `Nama petugas tidak boleh mengandung singkatan 1 huruf: ${name}` };
        }
    }

    return { isValid: true };
} 