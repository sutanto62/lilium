# Analytics Events Inventory

**Last Updated**: 2025-12-28
**Total Events**: 56

> **Note**: This inventory tracks all analytics events implemented across the codebase. Before adding new events, check this document to avoid duplicates and ensure consistent naming.

## Quick Reference

### Event Categories
- **Empty States**: 6 events
- **Errors**: 4 events
- **User Interactions**: 20 events
- **Page Views**: 9 events
- **Business Events**: 4 events

### Platforms
- **Statsig**: Server-side and client-side key events
- **PostHog**: Business context and autocapture (clicks, pageviews)
- **Both**: Dual tracking for critical events

---

## Event Categories

### Page Views

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_view` | Statsig + PostHog | `src/routes/admin/jadwal/+page.server.ts:178`<br>`src/routes/admin/jadwal/+page.server.ts:179`<br>`src/routes/admin/jadwal/+page.svelte:133` | Track page loads | `event_type` |
| `admin_misa_view` | Statsig | `src/routes/admin/misa/+page.svelte:143` | Track page loads | None |
| `admin_view` | Statsig | `src/routes/admin/+page.svelte:9` | Track page loads | None |
| `home_view` | Statsig + PostHog | `src/routes/+page.svelte:23`<br>`src/routes/+page.svelte:24` | Track page loads | `event_type` |
| `home_view_server` | Statsig + PostHog | `src/routes/+page.server.ts:26`<br>`src/routes/+page.server.ts:27` | Track page server-side loads | `event_type` |
| `lingkungan_titik_tugas_view` | Statsig + PostHog | `src/routes/lingkungan/+page.server.ts:31`<br>`src/routes/lingkungan/+page.server.ts:32`<br>`src/routes/lingkungan/+page.svelte:23`<br>`src/routes/lingkungan/+page.svelte:24` | Track page loads | `event_type` |
| `misa_view_server` | Statsig | `src/routes/admin/misa/+page.server.ts:31` | Track page server-side loads | None |
| `tatib_view` | Statsig + PostHog | `src/routes/f/tatib/+page.svelte:219`<br>`src/routes/f/tatib/+page.svelte:220` | Track page loads | `event_type`, `show_form` |
| `tatib_view_server` | Statsig + PostHog | `src/routes/f/tatib/+page.server.ts:111`<br>`src/routes/f/tatib/+page.server.ts:112` | Track page server-side loads | `event_type` |

### User Interactions

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_event_navigate` | PostHog | `src/routes/admin/jadwal/+page.svelte:119` | Track navigation events | None |
| `admin_jadwal_filter` | Statsig | `src/routes/admin/jadwal/+page.svelte:95` | Track filter change interactions | `previous_filter`, `new_filter`, `filtered_count`, `total_count` |
| `admin_jadwal_filter_change` | PostHog | `src/routes/admin/jadwal/+page.svelte:103` | Track filter changes with business context | None |
| `admin_misa_bulk_create_clicked` | PostHog | `src/routes/admin/misa/+page.svelte:99` | Track creation events | `next_month_start`, `next_month_end` |
| `admin_misa_date_filter_used` | PostHog | `src/routes/admin/misa/+page.svelte:70` | Track filter change interactions | `selected_date` |
| `admin_misa_edit_clicked` | PostHog | `src/routes/admin/misa/+page.svelte:331` | Track button/link clicks | None |
| `button_clicked` | PostHog | `src/components/PostHogDemo.svelte:12`<br>`src/lib/application/PostHogService.ts:1064`<br>`src/lib/utils/analytics.ts:29` | Track button/link clicks | `button_name`, `action` |
| `footer_external_link_click` | PostHog | `src/components/Footer.svelte:35` | Track external link clicks | `event_type` |
| `home_feature_click` | Statsig + PostHog | `src/routes/+page.svelte:44`<br>`src/routes/+page.svelte:50` | Track feature navigation | `event_type` |
| `lingkungan_titik_tugas_date_select` | Statsig + PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:245`<br>`src/routes/lingkungan/LingkunganTitikTugas.svelte:251` | Track date selection in lingkungan page | None |
| `lingkungan_titik_tugas_event_click` | Statsig + PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:221`<br>`src/routes/lingkungan/LingkunganTitikTugas.svelte:227` | Track copy titik tugas button clicks | None |
| `lingkungan_titik_tugas_event_select` | Statsig + PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:193`<br>`src/routes/lingkungan/LingkunganTitikTugas.svelte:199` | Track event selection in lingkungan page | None |
| `lingkungan_titik_tugas_filter` | Statsig | `src/routes/lingkungan/LingkunganTitikTugas.svelte:270` | Track filter change interactions | None |
| `lingkungan_titik_tugas_filter_change` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:276` | Track filter changes with business context | None |
| `tatib_copy_titik_tugas` | Statsig + PostHog | `src/routes/f/tatib/+page.svelte:174`<br>`src/routes/f/tatib/+page.svelte:179` | Track copy titik tugas button clicks | `event_type`, `action` |
| `tatib_regional_date_select` | Statsig + PostHog | `src/components/Regional.svelte:57`<br>`src/components/Regional.svelte:63` | Track date selection in lingkungan page | `event_type` |
| `tatib_regional_event_select` | Statsig + PostHog | `src/components/Regional.svelte:92`<br>`src/components/Regional.svelte:98` | Track event selection in lingkungan page | `event_type` |
| `tatib_regional_lingkungan_select` | Statsig + PostHog | `src/components/Regional.svelte:161`<br>`src/components/Regional.svelte:167` | Track selection interactions | `event_type` |
| `tatib_regional_wilayah_select` | Statsig + PostHog | `src/components/Regional.svelte:127`<br>`src/components/Regional.svelte:133` | Track selection interactions | `event_type` |
| `tatib_ushers_role_change` | Statsig + PostHog | `src/routes/f/tatib/UshersList.svelte:145`<br>`src/routes/f/tatib/UshersList.svelte:151` | Track role change interactions | None |

### Business Events

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_misa_bulk_create_success` | PostHog | `src/routes/admin/misa/+page.svelte:151` | Track bulk Misa creation success | `message` |
| `admin_misa_create` | Statsig | `src/routes/admin/misa/+page.svelte:148`<br>`src/routes/admin/misa/+page.svelte:162` | Track Misa creation (success/error) | `error` |
| `jadwal_detail` | Statsig | `src/routes/admin/jadwal/[id]/+page.server.ts:20` | Track jadwal detail page views | `eventId` |
| `tatib_success` | PostHog | `src/routes/f/tatib/+page.svelte:65` | Track user interaction | None |

### Errors

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_error` | Statsig + PostHog | `src/routes/admin/jadwal/+page.server.ts:110`<br>`src/routes/admin/jadwal/+page.server.ts:111` | Track errors and failures | `event_type` |
| `admin_misa_bulk_create_error` | PostHog | `src/routes/admin/misa/+page.svelte:167` | Track errors and failures | `error` |
| `lingkungan_titik_tugas_error` | Statsig + PostHog | `src/routes/lingkungan/+page.server.ts:52`<br>`src/routes/lingkungan/+page.server.ts:99`<br>`src/routes/lingkungan/+page.server.ts:53`<br>`src/routes/lingkungan/+page.server.ts:100` | Track errors and failures | `event_type` |
| `tatib_error` | Statsig + PostHog | `src/routes/f/tatib/+page.server.ts:141`<br>`src/routes/f/tatib/+page.server.ts:185`<br>`src/routes/f/tatib/+page.server.ts:231`<br>`src/routes/f/tatib/+page.server.ts:256`<br>`src/routes/f/tatib/+page.server.ts:287`<br>`src/routes/f/tatib/+page.server.ts:305`<br>`src/routes/f/tatib/+page.server.ts:324`<br>`src/routes/f/tatib/+page.server.ts:346`<br>`src/routes/f/tatib/+page.server.ts:366`<br>`src/routes/f/tatib/+page.server.ts:395`<br>`src/routes/f/tatib/+page.server.ts:407`<br>`src/routes/f/tatib/+page.server.ts:420`<br>`src/routes/f/tatib/+page.server.ts:433`<br>`src/routes/f/tatib/+page.server.ts:454`<br>`src/routes/f/tatib/+page.server.ts:480`<br>`src/routes/f/tatib/+page.server.ts:536`<br>`src/routes/f/tatib/+page.server.ts:142`<br>`src/routes/f/tatib/+page.server.ts:186`<br>`src/routes/f/tatib/+page.server.ts:232`<br>`src/routes/f/tatib/+page.server.ts:257`<br>`src/routes/f/tatib/+page.server.ts:288`<br>`src/routes/f/tatib/+page.server.ts:306`<br>`src/routes/f/tatib/+page.server.ts:325`<br>`src/routes/f/tatib/+page.server.ts:347`<br>`src/routes/f/tatib/+page.server.ts:367`<br>`src/routes/f/tatib/+page.server.ts:396`<br>`src/routes/f/tatib/+page.server.ts:408`<br>`src/routes/f/tatib/+page.server.ts:421`<br>`src/routes/f/tatib/+page.server.ts:434`<br>`src/routes/f/tatib/+page.server.ts:455`<br>`src/routes/f/tatib/+page.server.ts:481`<br>`src/routes/f/tatib/+page.server.ts:537`<br>`src/routes/f/tatib/+page.svelte:197`<br>`src/routes/f/tatib/+page.svelte:51`<br>`src/routes/f/tatib/+page.svelte:203` | Track errors and failures | `event_type` |

### Empty States

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_empty` | PostHog | `src/routes/admin/jadwal/+page.svelte:77` | Track completely empty page state | `has_past_events` |
| `admin_jadwal_empty_filter` | PostHog | `src/routes/admin/jadwal/+page.svelte:63` | Track empty filter results | None |
| `lingkungan_titik_tugas_empty_events` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:126` | Track completely empty page state | `has_selected_date` |
| `lingkungan_titik_tugas_empty_filter` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:164` | Track empty filter results | None |
| `lingkungan_titik_tugas_empty_filtered` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:138` | Track empty filter results | `selected_date`, `total_events` |
| `lingkungan_titik_tugas_empty_ushers` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:151` | Track completely empty page state | `event_id`, `has_events` |

---

## Event Details

### admin_jadwal_empty
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:77`
- **Purpose**: Track completely empty page state
- **Metadata**: 
  - `has_past_events`: Has Past Events
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_jadwal_empty_filter
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:63`
- **Purpose**: Track empty filter results
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_jadwal_error
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/jadwal/+page.server.ts:110`, `src/routes/admin/jadwal/+page.server.ts:111`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### admin_jadwal_event_navigate
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:119`
- **Purpose**: Track navigation events
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_jadwal_filter
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:95`
- **Purpose**: Track filter change interactions
- **Metadata**: 
  - `previous_filter`: Previous Filter
  - `new_filter`: New Filter
  - `filtered_count`: Filtered Count
  - `total_count`: Total Count
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_jadwal_filter_change
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/jadwal/+page.svelte:103`
- **Purpose**: Track filter changes with business context
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_jadwal_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/jadwal/+page.server.ts:178`, `src/routes/admin/jadwal/+page.server.ts:179`
  - Client: `src/routes/admin/jadwal/+page.svelte:133`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### admin_misa_bulk_create_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:99`
- **Purpose**: Track creation events
- **Metadata**: 
  - `next_month_start`: Next Month Start
  - `next_month_end`: Next Month End
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_misa_bulk_create_error
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:167`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `error`: Error
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_misa_bulk_create_success
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:151`
- **Purpose**: Track bulk Misa creation success
- **Metadata**: 
  - `message`: Message
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_misa_create
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:148`, `src/routes/admin/misa/+page.svelte:162`
- **Purpose**: Track Misa creation (success/error)
- **Metadata**: 
  - `error`: Error
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_misa_date_filter_used
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:70`
- **Purpose**: Track filter change interactions
- **Metadata**: 
  - `selected_date`: Selected Date
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_misa_edit_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:331`
- **Purpose**: Track button/link clicks
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_misa_view
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:143`
- **Purpose**: Track page loads
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### admin_view
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/routes/admin/+page.svelte:9`
- **Purpose**: Track page loads
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### button_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/components/PostHogDemo.svelte:12`, `src/lib/application/PostHogService.ts:1064`, `src/lib/utils/analytics.ts:29`
- **Purpose**: Track button/link clicks
- **Metadata**: 
  - `button_name`: Button Name
  - `action`: Action
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### custom_event
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/components/PostHogDemo.svelte:27`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### event_name
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/lib/application/PostHogService.ts:163`, `src/lib/utils/analytics.ts:19`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `prop`: Prop
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### footer_external_link
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/components/Footer.svelte:27`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### footer_external_link_click
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/components/Footer.svelte:35`
- **Purpose**: Track external link clicks
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### home_feature_click
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/+page.svelte:44`, `src/routes/+page.svelte:50`
- **Purpose**: Track feature navigation
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### home_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/+page.svelte:23`, `src/routes/+page.svelte:24`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### home_view_server
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/+page.server.ts:26`, `src/routes/+page.server.ts:27`
- **Purpose**: Track page server-side loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### jadwal_detail
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/jadwal/[id]/+page.server.ts:20`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `eventId`: EventId
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_date_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:245`, `src/routes/lingkungan/LingkunganTitikTugas.svelte:251`
- **Purpose**: Track date selection in lingkungan page
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_empty_events
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:126`
- **Purpose**: Track completely empty page state
- **Metadata**: 
  - `has_selected_date`: Has Selected Date
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_empty_filter
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:164`
- **Purpose**: Track empty filter results
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_empty_filtered
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:138`
- **Purpose**: Track empty filter results
- **Metadata**: 
  - `selected_date`: Selected Date
  - `total_events`: Total Events
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_empty_ushers
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:151`
- **Purpose**: Track completely empty page state
- **Metadata**: 
  - `event_id`: Event Id
  - `has_events`: Has Events
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_error
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/lingkungan/+page.server.ts:52`, `src/routes/lingkungan/+page.server.ts:99`, `src/routes/lingkungan/+page.server.ts:53`, `src/routes/lingkungan/+page.server.ts:100`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_event_click
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:221`, `src/routes/lingkungan/LingkunganTitikTugas.svelte:227`
- **Purpose**: Track copy titik tugas button clicks
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_event_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:193`, `src/routes/lingkungan/LingkunganTitikTugas.svelte:199`
- **Purpose**: Track event selection in lingkungan page
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_filter
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:270`
- **Purpose**: Track filter change interactions
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_filter_change
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:276`
- **Purpose**: Track filter changes with business context
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_petunjuk_open
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:289`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### lingkungan_titik_tugas_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/lingkungan/+page.server.ts:31`, `src/routes/lingkungan/+page.server.ts:32`
  - Client: `src/routes/lingkungan/+page.svelte:23`, `src/routes/lingkungan/+page.svelte:24`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### misa_view_server
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/misa/+page.server.ts:31`
- **Purpose**: Track page server-side loads
- **Metadata**: None
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### server_event
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/lib/utils/analytics.ts:37`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `data`: Data
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_confirm_ushers
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:510`, `src/routes/f/tatib/+page.server.ts:511`
  - Client: `src/routes/f/tatib/+page.svelte:252`, `src/routes/f/tatib/+page.svelte:258`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### tatib_copy_titik_tugas
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:174`, `src/routes/f/tatib/+page.svelte:179`
- **Purpose**: Track copy titik tugas button clicks
- **Metadata**: 
  - `event_type`: Event Type
  - `action`: Action
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_error
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:141`, `src/routes/f/tatib/+page.server.ts:185`, `src/routes/f/tatib/+page.server.ts:231`, `src/routes/f/tatib/+page.server.ts:256`, `src/routes/f/tatib/+page.server.ts:287`, `src/routes/f/tatib/+page.server.ts:305`, `src/routes/f/tatib/+page.server.ts:324`, `src/routes/f/tatib/+page.server.ts:346`, `src/routes/f/tatib/+page.server.ts:366`, `src/routes/f/tatib/+page.server.ts:395`, `src/routes/f/tatib/+page.server.ts:407`, `src/routes/f/tatib/+page.server.ts:420`, `src/routes/f/tatib/+page.server.ts:433`, `src/routes/f/tatib/+page.server.ts:454`, `src/routes/f/tatib/+page.server.ts:480`, `src/routes/f/tatib/+page.server.ts:536`, `src/routes/f/tatib/+page.server.ts:142`, `src/routes/f/tatib/+page.server.ts:186`, `src/routes/f/tatib/+page.server.ts:232`, `src/routes/f/tatib/+page.server.ts:257`, `src/routes/f/tatib/+page.server.ts:288`, `src/routes/f/tatib/+page.server.ts:306`, `src/routes/f/tatib/+page.server.ts:325`, `src/routes/f/tatib/+page.server.ts:347`, `src/routes/f/tatib/+page.server.ts:367`, `src/routes/f/tatib/+page.server.ts:396`, `src/routes/f/tatib/+page.server.ts:408`, `src/routes/f/tatib/+page.server.ts:421`, `src/routes/f/tatib/+page.server.ts:434`, `src/routes/f/tatib/+page.server.ts:455`, `src/routes/f/tatib/+page.server.ts:481`, `src/routes/f/tatib/+page.server.ts:537`
  - Client: `src/routes/f/tatib/+page.svelte:197`, `src/routes/f/tatib/+page.svelte:51`, `src/routes/f/tatib/+page.svelte:203`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### tatib_regional_date_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:57`, `src/components/Regional.svelte:63`
- **Purpose**: Track date selection in lingkungan page
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_regional_event_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:92`, `src/components/Regional.svelte:98`
- **Purpose**: Track event selection in lingkungan page
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_regional_lingkungan_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:161`, `src/components/Regional.svelte:167`
- **Purpose**: Track selection interactions
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_regional_wilayah_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:127`, `src/components/Regional.svelte:133`
- **Purpose**: Track selection interactions
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_success
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:65`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_ushers_add
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:204`, `src/routes/f/tatib/UshersList.svelte:210`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_ushers_form_ready
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:258`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_ushers_max_limit
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:166`, `src/routes/f/tatib/UshersList.svelte:172`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_ushers_progress
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:245`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_ushers_reset
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:292`, `src/routes/f/tatib/UshersList.svelte:298`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_ushers_role_change
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:145`, `src/routes/f/tatib/UshersList.svelte:151`
- **Purpose**: Track role change interactions
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_validate_ushers
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:140`, `src/routes/f/tatib/+page.svelte:146`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:219`, `src/routes/f/tatib/+page.svelte:220`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
  - `show_form`: Show Form
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

### tatib_view_server
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:111`, `src/routes/f/tatib/+page.server.ts:112`
- **Purpose**: Track page server-side loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2025-12-28

### user_action
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/lib/utils/analytics.ts:33`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `action`: Action
  - `data`: Data
- **Trigger**: Client-side event
- **Last Updated**: 2025-12-28

