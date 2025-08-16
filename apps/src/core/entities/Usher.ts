
// formatted response: returned name instead of UUID
export interface UsherResponse {
    id: string;
    event: string;
    name: string;
    zone: string | null;
    wilayah: string | null;
    lingkungan: string | null;
    isPpg: boolean | false;
    isKolekte: boolean | false;
    position: string | null;
    sequence: number | null;
    createdAt: number | null;
}
