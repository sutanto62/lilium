import type { PageServerLoad } from '../../$types';
import { captureEvent } from '$src/lib/utils/analytic';

export const load: PageServerLoad = async (events) => {
    await captureEvent(events, 'petunjuk_page_view');
    return {};
};
