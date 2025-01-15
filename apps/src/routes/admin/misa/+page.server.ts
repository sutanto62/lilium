import type { Mass } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { logger } from '$src/lib/utils/logger';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const mockMasses: Mass[] = [
    {
        id: '1',
        code: 'MASS-01',
        name: 'Misa Minggu Pagi',
        sequence: 1,
        church: 'church-1',
        day: 'sunday'
    },
    {
        id: '2',
        code: 'MASS-02',
        name: 'Misa Minggu Siang',
        sequence: 2,
        church: 'church-1',
        day: 'sunday'
    },
    {
        id: '3',
        code: 'MASS-03',
        name: 'Misa Minggu Sore',
        sequence: 3,
        church: 'church-1',
        day: 'sunday'
    }
];

export const load: PageServerLoad = async (events) => {
    logger.info('Loading page admin/misa');

    const session = await events.locals.auth();
    if (!session) {
        logger.error('User not authenticated');
        throw redirect(302, '/signin');
    }

    const churchId = session.user?.cid ?? '';
    const churchService = new ChurchService(churchId);

    const masses = await churchService.getMasses();

    logger.debug(`Masses loaded ${JSON.stringify(masses)}`);

    return {
        masses
    };
};
