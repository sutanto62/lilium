---
name: track
description: >
  Review or implement analytics event tracking following this project's dual-tracking strategy
  (Statsig + PostHog). Trigger whenever: a new page or route is created (every new page needs
  analytics); the user adds a filter, status change, or business logic event; the user asks
  "add tracking", "add analytics", "is this tracked?", "review my events"; or when working
  in +page.server.ts or +page.svelte files. Also trigger when event names or metadata look
  inconsistent — naming mistakes silently break dashboards. When a new page is finished,
  always check if server-side load tracking and key client interactions are covered.
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

Track page loads and data metrics from the server — this gives you performance and usage data that client-side can't reliably capture:

```typescript
const startTime = Date.now();
// ... data fetching ...
const metadata = {
  total_items: items.length,
  load_time_ms: Date.now() - startTime,
  has_items: items.length > 0
};

await Promise.all([
  statsigService.logEvent('page_action_context', 'load', session || undefined, metadata),
  posthogService.trackEvent('page_action_context', { event_type: 'page_load', ...metadata }, session || undefined)
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
