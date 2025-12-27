# Analytics Events Inventory

**Last Updated**: 2025-01-27  
**Total Events**: 24

> **Note**: This inventory tracks all analytics events implemented across the codebase. Before adding new events, check this document to avoid duplicates and ensure consistent naming.

## Quick Reference

### Event Categories
- **Page Views**: 9 events
- **User Interactions**: 6 events
- **Business Events**: 4 events
- **Errors**: 3 events
- **Empty States**: 2 events

### Platforms
- **Statsig**: Server-side and client-side key events
- **PostHog**: Business context and autocapture (clicks, pageviews)
- **Both**: Dual tracking for critical events

---

## Event Categories

### Page Views

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_view` | Statsig + PostHog | `src/routes/admin/jadwal/+page.server.ts:178`<br>`src/routes/admin/jadwal/+page.svelte:133` | Track page loads with performance metrics | `total_events`, `next_two_weeks_count`, `past_events_count`, `masses_count`, `load_time_ms`, `has_events` |
| `admin_misa_view` | Statsig | `src/routes/admin/misa/+page.svelte:143` | Track Misa page loads | None |
| `admin_view` | Statsig | `src/routes/admin/+page.svelte:9` | Track admin dashboard loads | None |
| `home_view` | Statsig | `src/routes/+page.svelte:14` | Track home page loads | None |
| `home_view_server` | Statsig | `src/routes/+page.server.ts:6` | Track home page server-side loads | None |
| `lingkungan_view` | Statsig | `src/routes/lingkungan/+page.svelte:10` | Track lingkungan page loads | None |
| `lingkungan_view_server` | Statsig | `src/routes/lingkungan/+page.server.ts:10` | Track lingkungan page server-side loads | None |
| `misa_view_server` | Statsig | `src/routes/admin/misa/+page.server.ts:31` | Track Misa page server-side loads | None |
| `tatib_view_server` | Statsig | `src/routes/f/tatib/+page.server.ts:63` | Track Tatib page server-side loads | None |

### User Interactions

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_filter` | Statsig | `src/routes/admin/jadwal/+page.svelte:95` | Track filter change interactions | `previous_filter`, `new_filter`, `filtered_count`, `total_count` |
| `admin_jadwal_filter_change` | PostHog | `src/routes/admin/jadwal/+page.svelte:103` | Track filter changes with business context | `previous_filter`, `new_filter`, `filtered_count`, `total_count`, `filter_type` |
| `admin_jadwal_event_navigate` | PostHog | `src/routes/admin/jadwal/+page.svelte:119` | Track event link clicks with progress context | `event_id`, `event_date`, `progress_percentage`, `progress_status` |
| `lingkungan_select_event` | Statsig | `src/routes/lingkungan/LingkunganTitikTugas.svelte:123` | Track event selection in lingkungan page | Event selection metadata |
| `lingkungan_select_date` | Statsig | `src/routes/lingkungan/LingkunganTitikTugas.svelte:141` | Track date selection in lingkungan page | Date selection metadata |
| `tatib_copy_titik_tugas` | Statsig | `src/routes/f/tatib/+page.svelte:128` | Track copy titik tugas button clicks | None |
| `tatib_view` | Statsig | `src/routes/f/tatib/+page.svelte:136` | Track Tatib page confirmations | None |

### Business Events

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_misa_create` | Statsig | `src/routes/admin/misa/+page.svelte:148,162` | Track Misa creation (success/error) | `error` (on error) |
| `admin_misa_bulk_create_success` | PostHog | `src/routes/admin/misa/+page.svelte:151` | Track bulk Misa creation success | `message` |
| `admin_misa_bulk_create_error` | PostHog | `src/routes/admin/misa/+page.svelte:167` | Track bulk Misa creation errors | `error` |
| `jadwal_detail` | Statsig | `src/routes/admin/jadwal/[id]/+page.server.ts:20` | Track jadwal detail page views | `eventId` |

### Errors

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_error` | Statsig + PostHog | `src/routes/admin/jadwal/+page.server.ts:110` | Track data fetch failures | `error_type`, `error_message` |

### Empty States

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_empty` | PostHog | `src/routes/admin/jadwal/+page.svelte:77` | Track completely empty page state | `has_past_events` |
| `admin_jadwal_empty_filter` | PostHog | `src/routes/admin/jadwal/+page.svelte:63` | Track empty filter results | `filter`, `total_events`, `filter_type` |

---

## Event Details

### admin_jadwal_view
- **Platforms**: Statsig (server + client), PostHog (server)
- **Locations**: 
  - Server: `src/routes/admin/jadwal/+page.server.ts:178`
  - Client: `src/routes/admin/jadwal/+page.svelte:133`
- **Purpose**: Track page loads with performance metrics and data availability
- **Metadata**: 
  - `total_events`: Total number of events
  - `next_two_weeks_count`: Events in next two weeks
  - `past_events_count`: Past events count
  - `masses_count`: Number of masses
  - `load_time_ms`: Page load time in milliseconds
  - `has_events`: Boolean indicating if events exist
- **Trigger**: Page load (server-side and client-side)
- **Last Updated**: 2025-01-27

### admin_jadwal_error
- **Platforms**: Statsig + PostHog (server)
- **Locations**: 
  - Server: `src/routes/admin/jadwal/+page.server.ts:110`
- **Purpose**: Track and diagnose data fetch failures
- **Metadata**: 
  - `error_type`: Error type/name
  - `error_message`: Error message
- **Trigger**: Data fetch failure in server load function
- **Last Updated**: 2025-01-27

### admin_jadwal_filter
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:95`
- **Purpose**: Track user filter preferences and usage patterns
- **Metadata**: 
  - `previous_filter`: Previous filter value
  - `new_filter`: New filter value
  - `filtered_count`: Number of events after filtering
  - `total_count`: Total number of events
- **Trigger**: Filter change interaction
- **Last Updated**: 2025-01-27

### admin_jadwal_filter_change
- **Platforms**: PostHog (client)
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:103`
- **Purpose**: Analyze filter usage patterns and user behavior
- **Metadata**: 
  - `previous_filter`: Previous filter value
  - `new_filter`: New filter value
  - `filtered_count`: Number of events after filtering
  - `total_count`: Total number of events
  - `filter_type`: Type of filter applied
- **Trigger**: Filter change interaction
- **Last Updated**: 2025-01-27

### admin_jadwal_event_navigate
- **Platforms**: PostHog (client)
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:119`
- **Purpose**: Understand which events users view and their completion status
- **Metadata**: 
  - `event_id`: Event identifier
  - `event_date`: Event date
  - `progress_percentage`: Completion percentage (0-100)
  - `progress_status`: Status ('complete', 'partial', 'unconfirmed')
- **Trigger**: Event link click (autocaptured by PostHog, adds business metadata)
- **Last Updated**: 2025-01-27

### admin_jadwal_empty
- **Platforms**: PostHog (client)
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:77`
- **Purpose**: Track when no events are available (data quality insight)
- **Metadata**: 
  - `has_past_events`: Boolean indicating if past events exist
- **Trigger**: Reactive effect when `upcomingEvents.length === 0`
- **Last Updated**: 2025-01-27

### admin_jadwal_empty_filter
- **Platforms**: PostHog (client)
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:63`
- **Purpose**: Identify filters that return no results (UX insight)
- **Metadata**: 
  - `filter`: Current filter value
  - `total_events`: Total number of events
  - `filter_type`: Type of filter applied
- **Trigger**: Reactive effect when filter returns no results but events exist
- **Last Updated**: 2025-01-27

### admin_misa_view
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:143`
- **Purpose**: Track Misa page loads
- **Metadata**: None
- **Trigger**: Page load (only if no form state)
- **Last Updated**: 2025-01-27

### admin_misa_create
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:148,162`
- **Purpose**: Track Misa creation success and errors
- **Metadata**: 
  - `error`: Error message (on error only)
- **Trigger**: Form submission result (success or error)
- **Last Updated**: 2025-01-27

### admin_misa_bulk_create_success
- **Platforms**: PostHog (client)
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:151`
- **Purpose**: Track bulk Misa creation success
- **Metadata**: 
  - `message`: Success message
- **Trigger**: Form submission success
- **Last Updated**: 2025-01-27

### admin_misa_bulk_create_error
- **Platforms**: PostHog (client)
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:167`
- **Purpose**: Track bulk Misa creation errors
- **Metadata**: 
  - `error`: Error message
- **Trigger**: Form submission error
- **Last Updated**: 2025-01-27

### jadwal_detail
- **Platforms**: Statsig (server)
- **Locations**: 
  - Server: `src/routes/admin/jadwal/[id]/+page.server.ts:20`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `eventId`: Event identifier from URL params
- **Trigger**: Page load
- **Last Updated**: 2025-01-27

### admin_view
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/admin/+page.svelte:9`
- **Purpose**: Track admin dashboard loads
- **Metadata**: None
- **Trigger**: Page load
- **Last Updated**: 2025-01-27

### home_view
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/+page.svelte:14`
- **Purpose**: Track home page loads
- **Metadata**: None
- **Trigger**: Page load
- **Last Updated**: 2025-01-27

### home_view_server
- **Platforms**: Statsig (server)
- **Locations**: 
  - Server: `src/routes/+page.server.ts:6`
- **Purpose**: Track home page server-side loads
- **Metadata**: None
- **Trigger**: Server-side page load
- **Last Updated**: 2025-01-27

### lingkungan_view
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/lingkungan/+page.svelte:10`
- **Purpose**: Track lingkungan page loads
- **Metadata**: None
- **Trigger**: Page load
- **Last Updated**: 2025-01-27

### lingkungan_view_server
- **Platforms**: Statsig (server)
- **Locations**: 
  - Server: `src/routes/lingkungan/+page.server.ts:10`
- **Purpose**: Track lingkungan page server-side loads
- **Metadata**: None
- **Trigger**: Server-side page load
- **Last Updated**: 2025-01-27

### lingkungan_select_event
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:123`
- **Purpose**: Track event selection in lingkungan page
- **Metadata**: Event selection metadata (specific fields to be documented)
- **Trigger**: Event selection interaction
- **Last Updated**: 2025-01-27

### lingkungan_select_date
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:141`
- **Purpose**: Track date selection in lingkungan page
- **Metadata**: Date selection metadata (specific fields to be documented)
- **Trigger**: Date selection interaction
- **Last Updated**: 2025-01-27

### misa_view_server
- **Platforms**: Statsig (server)
- **Locations**: 
  - Server: `src/routes/admin/misa/+page.server.ts:31`
- **Purpose**: Track Misa page server-side loads
- **Metadata**: None
- **Trigger**: Server-side page load
- **Last Updated**: 2025-01-27

### tatib_view_server
- **Platforms**: Statsig (server)
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:63`
- **Purpose**: Track Tatib page server-side loads
- **Metadata**: None
- **Trigger**: Server-side page load
- **Last Updated**: 2025-01-27

### tatib_copy_titik_tugas
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:128`
- **Purpose**: Track copy titik tugas button clicks
- **Metadata**: None
- **Trigger**: Button click
- **Last Updated**: 2025-01-27

### tatib_view
- **Platforms**: Statsig (client)
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:136`
- **Purpose**: Track Tatib page confirmations
- **Metadata**: None
- **Trigger**: Page confirmation/view
- **Last Updated**: 2025-01-27

---

## Maintenance

### Adding New Events

1. **Check this inventory** for existing similar events
2. **Follow naming convention**: `{page}_{action}_{context}` (see `.cursor/rules/event-tracking.mdc`)
3. **Implement tracking code** following project rules
4. **Update this document** with new event entry
5. **Run scanner script** to verify: `npm run scan:events`

### Updating Existing Events

1. Update tracking code
2. Update inventory document entry
3. Update "Last Updated" date
4. Note any breaking changes in metadata

### Regular Audits

Run monthly:
```bash
npm run scan:events
```

Compare output with this document and update any missing entries.

---

## Event Naming Patterns

### Current Patterns
- `{page}_view`: Page load events
- `{page}_view_server`: Server-side page loads
- `{page}_{action}`: User interactions
- `{page}_{action}_{context}`: Specific interactions with context
- `{page}_error`: Error tracking
- `{page}_empty`: Empty state tracking

### Examples
- `admin_jadwal_view`: Admin jadwal page view
- `admin_jadwal_filter_change`: Filter change on jadwal page
- `admin_jadwal_event_navigate`: Event navigation on jadwal page
- `admin_jadwal_empty_filter`: Empty filter results on jadwal page

---

## Platform Usage Guidelines

### Statsig
- Server-side key events
- Client-side critical events
- Error tracking
- Performance metrics

### PostHog
- Business context events
- User behavior analysis
- Empty states
- Leverages autocapture for basic interactions (clicks, pageviews)

### Dual Tracking
- Critical events tracked on both platforms
- Server-side: Both Statsig and PostHog
- Client-side: Statsig for key events, PostHog for business context

---

## Related Documentation

- [Event Tracking Rules](.cursor/rules/event-tracking.mdc)
- [Jadwal Tracking Review](doc/jadwal-tracking-review.md)
- [Jadwal Tracking Suggestions](doc/jadwal-tracking-suggestions.md)

