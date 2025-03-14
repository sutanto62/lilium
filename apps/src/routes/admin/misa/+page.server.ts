import type { Mass } from '$core/entities/Schedule';
import { ChurchService } from '$core/service/ChurchService';
import { captureEvent } from '$src/lib/utils/analytic';
import { logger } from '$src/lib/utils/logger';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

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

    await captureEvent(events, 'misa_page_view');

    return {
        masses
    };
};
