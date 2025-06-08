import { statsigService } from '$src/lib/application/StatsigService';

export const load = async () => {
    // Use Statsig
    await statsigService.use();
};