---
name: track
description: >
  Review or implement analytics event tracking (Statsig + PostHog). Use when the user explicitly
  says "add tracking", "add analytics", "review my events", "is this tracked?", or "/track".
  Also use when the user asks to audit event names for consistency, or when finishing a new
  route and asking whether tracking is complete.
---

Review or implement analytics tracking following the dual-tracking strategy (Statsig + PostHog). Before adding new events, check `doc/events-inventory.md` and run `npm run scan:events` to see what's already tracked.

## Event Naming

Pattern: `{page}_{action}_{context}` in `snake_case`

```
✅ admin_jadwal_view
✅ admin_jadwal_filter_change
✅ admin_zona_empty_state
❌ jadwal_view        (missing page prefix)
❌ filterClick        (camelCase — breaks dashboards)
❌ admin_view         (too generic — which page?)
```

## Server-Side Tracking (`+page.server.ts`)

Track page loads and data metrics from the server — this gives you performance and usage data that client-side can't reliably capture.

**IMPORTANT**: `posthogService` (from `PostHogService.ts`) is browser-only — calling `posthogService.trackEvent()` in `+page.server.ts` silently no-ops. Use `trackServerEvent` from `posthogNode` instead:

```typescript
import { trackServerEvent } from '$src/lib/server/posthogNode';

const startTime = Date.now();
// ... data fetching ...
const metadata = {
  total_items: items.length,
  load_time_ms: Date.now() - startTime,
  has_items: items.length > 0
};

await Promise.all([
  statsigService.logEvent('page_action_context', 'load', session || undefined, metadata),
  trackServerEvent('page_action_context', { event_type: 'page_load', ...metadata }, session || undefined)
]);
```

## Client-Side Tracking (`+page.svelte`)

Track user interactions that carry meaningful business context:

```typescript
import { statsigService } from '$src/lib/application/StatsigService.js';
import { tracker } from '$src/lib/utils/analytics';

// On user action:
statsigService.logEvent('admin_jadwal_filter', 'change', page.data.session || undefined, metadata);
await tracker.track('admin_jadwal_filter_change', metadata, page.data.session, page);
```

Use `$effect()` for reactive tracking, not `onMount`:

```typescript
$effect(() => {
  if (filteredItems().length === 0) {
    tracker.track('admin_page_empty_filter', { filter: currentFilter }, page.data.session, page);
  }
});
```

## Metadata Guidelines

- Keys always `snake_case`
- Include counts, previous state, and progress where relevant
- Always include session context (`session || undefined`)

## What NOT to track manually

PostHog autocapture already handles these — adding manual events duplicates data:
- Basic button/link clicks
- Page views
- Form submissions

## What requires manual tracking

- Filter changes with current filter value as metadata
- Business logic milestones (e.g. schedule published, usher assigned)
- Empty states — valuable for UX improvement
- Server-side load time and record counts
- Error conditions with context (what failed, what the user was doing)

## Checklist

- [ ] New page has server-side load tracking with timing + count metadata
- [ ] Key user interactions (filters, status changes) have client-side tracking
- [ ] All event names follow `{page}_{action}_{context}` pattern
- [ ] No manual tracking of autocaptured events
- [ ] `doc/events-inventory.md` updated with new events

## Validation

Run `npm run scan:events` to audit the full event list after changes.
