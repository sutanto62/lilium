import type { Church } from "$core/entities/schedule";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { ChurchService } from "$core/service/ChurchService";
import { repo } from "$src/lib/server/db";
import type { EventService } from "$core/service/EventService";

let churchService: ChurchService;

export const load: PageServerLoad = async (events) => {
    const churchId = events.cookies.get('cid') as string | '';
    let church: Church | null = null;
    church = await repo.findChurchById(churchId);
    if (!church) {
        throw error(404, 'Gereja belum terdaftar');
    }
    churchService = new ChurchService(churchId);
    const masses = await churchService.getMasses();
    return { masses };
}
