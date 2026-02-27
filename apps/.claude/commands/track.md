Review or implement analytics event tracking following our dual-tracking strategy (Statsig + PostHog).

## Rules

**Event Naming** — pattern: `{page}_{action}_{context}` in `snake_case`
```
✅ admin_jadwal_view
✅ admin_jadwal_filter_change
❌ jadwal_view        (missing context)
❌ filterClick        (wrong casing)
```

**Server-Side Tracking** (in `+page.server.ts`)
```typescript
const startTime = Date.now();
// ... data fetching ...
const metadata = {
  total_events: events.length,
  load_time_ms: Date.now() - startTime,
  has_events: events.length > 0
};
await Promise.all([
  statsigService.logEvent('page_action_context', 'load', session || undefined, metadata),
  posthogService.trackEvent('page_action_context', { event_type: 'page_load', ...metadata }, session || undefined)
]);
```

**Client-Side Tracking** (in `.svelte` files)
```typescript
import { statsigService } from '$src/lib/application/StatsigService.js';
import { tracker } from '$src/lib/utils/analytics';

statsigService.logEvent('admin_jadwal_filter', 'change', page.data.session || undefined, metadata);
await tracker.track('admin_jadwal_filter_change', metadata, page.data.session, page);
```

**Metadata Guidelines**
- Always use `snake_case` keys
- Include rich context (previous state, counts, progress)
- Always include session context

**What NOT to track manually** (PostHog autocapture handles these):
- Basic button/link clicks
- Page views
- Form submissions

**What to track manually:**
- Filter changes with metadata
- Business logic events (progress, status changes)
- Empty states for UX insights
- Server-side performance metrics
- Error conditions with context

**Reactive tracking** — use `$effect()`, not `onMount`:
```typescript
$effect(() => {
  if (filteredEvents().length === 0) {
    tracker.track('admin_jadwal_empty_filter', { filter: currentFilter }, page.data.session, page);
  }
});
```

Review the code and flag any tracking that is missing, misnamed, or manually tracking autocaptured events.
