// src/routes/+layout.ts

import posthog from 'posthog-js'
import { browser } from '$app/environment';

export const load = async () => {

    if (browser) {
        posthog.init(
            import.meta.env.VITE_POSTHOG_KEY,
            {
                api_host: import.meta.env.VITE_POSTHOG_HOST,
                person_profiles: 'always',
                capture_pageview: true, // prevent double count pageviews and pageleaves
                capture_pageleave: true, // prevent double count pageviews and pageleaves
                persistence: 'localStorage'
            }
        );
    }
  return
};
