# Analytics Events Inventory

**Last Updated**: 2026-05-30
**Total Events**: 139

> **Note**: This inventory tracks all analytics events implemented across the codebase. Before adding new events, check this document to avoid duplicates and ensure consistent naming.

## Quick Reference

### Event Categories
- **Page Views**: 26 events
- **Business Events**: 28 events
- **Empty States**: 6 events
- **Errors**: 8 events
- **User Interactions**: 22 events

### Platforms
- **Statsig**: Server-side and client-side key events
- **PostHog**: Business context and autocapture (clicks, pageviews)
- **Both**: Dual tracking for critical events

---

## Event Categories

### Page Views

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_church_view` | Statsig | `src/routes/admin/settings/gereja/+page.server.ts:50` | Track page loads | `event_type` |
| `admin_dashboard_view` | Statsig + PostHog | `src/routes/admin/+page.server.ts:25`<br>`src/routes/admin/+page.svelte:20`<br>`src/routes/admin/+page.svelte:21` | Track page loads | `event_type`, `page` |
| `admin_jadwal_cetak_view` | Statsig | `src/routes/admin/tatib/[id]/cetak/+page.server.ts:32` | Track page loads | `event_type` |
| `admin_jadwal_detail_view` | Statsig | `src/routes/admin/tatib/[id]/+page.server.ts:67` | Track page loads | `event_type` |
| `admin_jadwal_view` | Statsig + PostHog | `src/routes/admin/tatib/+page.server.ts:179`<br>`src/routes/admin/tatib/+page.svelte:147`<br>`src/routes/admin/tatib/+page.svelte:148` | Track page loads | `event_type` |
| `admin_lingkungan_view` | Statsig | `src/routes/admin/settings/lingkungan/+page.server.ts:58` | Track page loads | `event_type` |
| `admin_misa_create_view` | Statsig + PostHog | `src/routes/admin/misa/create/+page.server.ts:70`<br>`src/routes/admin/misa/create/+page.svelte:47`<br>`src/routes/admin/misa/create/+page.svelte:48` | Track page loads | `event_type` |
| `admin_misa_view` | Statsig + PostHog | `src/routes/admin/misa/+page.svelte:154`<br>`src/routes/admin/misa/+page.svelte:155`<br>`src/routes/admin/settings/misa/+page.server.ts:55`<br>`src/routes/admin/settings/misa/+page.svelte:123`<br>`src/routes/admin/settings/misa/+page.svelte:124` | Track page loads | `event_type` |
| `admin_parish_view` | Statsig | `src/routes/admin/settings/paroki/+page.server.ts:61` | Track page loads | `event_type` |
| `admin_posisi_detail_view` | Statsig | `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:75` | Track page loads | `ppg_enabled` |
| `admin_posisi_view` | Statsig + PostHog | `src/routes/admin/settings/data-posisi/+page.server.ts:63`<br>`src/routes/admin/settings/data-posisi/+page.svelte:142`<br>`src/routes/admin/settings/data-posisi/+page.svelte:143` | Track page loads | `event_type` |
| `admin_struktur_view` | Statsig | `src/routes/admin/settings/struktur/+page.server.ts:69` | Track page loads | `event_type` |
| `admin_user_view` | Statsig | `src/routes/admin/settings/user/+page.server.ts:57` | Track page loads | `event_type` |
| `admin_wilayah_view` | Statsig | `src/routes/admin/settings/wilayah/+page.server.ts:55` | Track page loads | `event_type` |
| `admin_zone_misa_view` | Statsig + PostHog | `src/routes/admin/settings/data-misa/+page.server.ts:49`<br>`src/routes/admin/settings/data-misa/+page.svelte:123`<br>`src/routes/admin/settings/data-misa/+page.svelte:124` | Track page loads | `event_type` |
| `admin_zone_misa_zona_view` | Statsig + PostHog | `src/routes/admin/settings/data-zona-misa/+page.server.ts:54`<br>`src/routes/admin/settings/data-zona-misa/+page.svelte:96`<br>`src/routes/admin/settings/data-zona-misa/+page.svelte:97` | Track page loads | `event_type` |
| `admin_zone_v2_view` | Statsig | `src/routes/admin/zone/+page.server.ts:61` | Track page loads | `event_type` |
| `admin_zone_zona_group_view` | Statsig + PostHog | `src/routes/admin/settings/data-zona-group/+page.server.ts:49`<br>`src/routes/admin/settings/data-zona-group/+page.svelte:103`<br>`src/routes/admin/settings/data-zona-group/+page.svelte:104` | Track page loads | `event_type` |
| `admin_zone_zona_view` | Statsig + PostHog | `src/routes/admin/settings/data-zona/+page.server.ts:53`<br>`src/routes/admin/settings/data-zona/+page.svelte:106`<br>`src/routes/admin/settings/data-zona/+page.svelte:107` | Track page loads | `event_type` |
| `home_view` | Statsig + PostHog | `src/routes/+page.svelte:23`<br>`src/routes/+page.svelte:24` | Track page loads | `event_type` |
| `home_view_server` | Statsig | `src/routes/+page.server.ts:27` | Track page server-side loads | `event_type` |
| `lingkungan_titik_tugas_view` | Statsig + PostHog | `src/routes/lingkungan/+page.server.ts:32`<br>`src/routes/lingkungan/+page.svelte:23`<br>`src/routes/lingkungan/+page.svelte:24` | Track page loads | `event_type` |
| `misa_view_server` | Statsig | `src/routes/admin/misa/+page.server.ts:31` | Track page server-side loads | None |
| `tatib_new_view` | Statsig | `src/routes/f/tatib/+page.server.ts:134` | Track page loads | `event_type` |
| `tatib_view` | Statsig + PostHog | `src/routes/f/tatib/+page.svelte:222`<br>`src/routes/f/tatib/+page.svelte:223` | Track page loads | `event_type`, `show_form` |
| `tatib_view_server` | Statsig | `src/routes/f/tatib/+page.server.ts:208` | Track page server-side loads | `event_type` |

### User Interactions

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_event_navigate` | PostHog | `src/routes/admin/tatib/+page.svelte:118` | Track navigation events | None |
| `admin_jadwal_filter` | Statsig | `src/routes/admin/tatib/+page.svelte:94` | Track filter change interactions | `previous_filter`, `new_filter`, `filtered_count`, `total_count` |
| `admin_jadwal_filter_change` | PostHog | `src/routes/admin/tatib/+page.svelte:102` | Track filter changes with business context | None |
| `admin_misa_bulk_create_clicked` | PostHog | `src/routes/admin/misa/+page.svelte:99` | Track creation events | `next_month_start`, `next_month_end` |
| `admin_misa_create_button_clicked` | PostHog | `src/routes/admin/misa/+page.svelte:265` | Track creation events | `source` |
| `admin_misa_date_filter_used` | PostHog | `src/routes/admin/misa/+page.svelte:70` | Track filter change interactions | `selected_date` |
| `admin_misa_edit_clicked` | PostHog | `src/routes/admin/misa/+page.svelte:362` | Track button/link clicks | None |
| `admin_posisi_edit_clicked` | PostHog | `src/routes/admin/settings/data-posisi/+page.svelte:103` | Track button/link clicks | None |
| `button_clicked` | PostHog | `src/components/PostHogDemo.svelte:12`<br>`src/lib/application/PostHogService.ts:702`<br>`src/lib/utils/analytics.ts:29` | Track button/link clicks | `button_name`, `action` |
| `footer_external_link_click` | PostHog | `src/components/Footer.svelte:35` | Track external link clicks | `event_type` |
| `home_feature_click` | Statsig + PostHog | `src/routes/+page.svelte:44`<br>`src/routes/+page.svelte:50` | Track feature navigation | `event_type` |
| `lingkungan_titik_tugas_copy_roster` | Statsig + PostHog | `src/routes/lingkungan/UsherDutyTable.svelte:72`<br>`src/routes/lingkungan/UsherDutyTable.svelte:78` | Track copy titik tugas button clicks | `usher_count`, `group_count` |
| `lingkungan_titik_tugas_date_select` | Statsig + PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:130`<br>`src/routes/lingkungan/LingkunganTitikTugas.svelte:136` | Track date selection in lingkungan page | `date`, `previous_date`, `filtered_events_count`, `total_events` |
| `lingkungan_titik_tugas_event_select` | Statsig + PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:109`<br>`src/routes/lingkungan/LingkunganTitikTugas.svelte:115` | Track event selection in lingkungan page | `event_id`, `previous_event_id`, `event_date`, `event_description` |
| `lingkungan_titik_tugas_filter` | Statsig | `src/routes/lingkungan/LingkunganTitikTugas.svelte:144` | Track filter change interactions | None |
| `lingkungan_titik_tugas_filter_change` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:151` | Track filter changes with business context | `previous_filter`, `new_filter` |
| `tatib_copy_titik_tugas` | Statsig + PostHog | `src/routes/f/tatib/+page.svelte:177`<br>`src/routes/f/tatib/+page.svelte:182` | Track copy titik tugas button clicks | `event_type`, `action` |
| `tatib_regional_date_select` | Statsig + PostHog | `src/components/Regional.svelte:57`<br>`src/components/Regional.svelte:63` | Track date selection in lingkungan page | `event_type` |
| `tatib_regional_event_select` | Statsig + PostHog | `src/components/Regional.svelte:92`<br>`src/components/Regional.svelte:98` | Track event selection in lingkungan page | `event_type` |
| `tatib_regional_lingkungan_select` | Statsig + PostHog | `src/components/Regional.svelte:161`<br>`src/components/Regional.svelte:167` | Track selection interactions | `event_type` |
| `tatib_regional_wilayah_select` | Statsig + PostHog | `src/components/Regional.svelte:127`<br>`src/components/Regional.svelte:133` | Track selection interactions | `event_type` |
| `tatib_ushers_role_change` | Statsig + PostHog | `src/routes/f/tatib/UshersList.svelte:154`<br>`src/routes/f/tatib/UshersList.svelte:160` | Track role change interactions | None |

### Business Events

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_detail_deactivate` | Statsig | `src/routes/admin/tatib/[id]/+page.server.ts:283` | Track jadwal detail page views | `event_id`, `event_type` |
| `admin_jadwal_detail_pic_update` | Statsig | `src/routes/admin/tatib/[id]/+page.server.ts:316` | Track jadwal detail page views | `event_type` |
| `admin_jadwal_detail_snapshot_download` | Statsig + PostHog | `src/components/jadwal/JadwalKonfirmasiDetail.svelte:50`<br>`src/components/jadwal/JadwalKonfirmasiDetail.svelte:51` | Track jadwal detail page views | `event_type` |
| `admin_jadwal_detail_usher_delete` | Statsig | `src/routes/admin/tatib/[id]/+page.server.ts:344` | Track jadwal detail page views | `event_type` |
| `admin_lingkungan_create` | Statsig | `src/routes/admin/settings/lingkungan/+page.server.ts:87` | Track creation events | `church_id`, `event_type` |
| `admin_misa_bulk_create_success` | PostHog | `src/routes/admin/misa/+page.svelte:164` | Track bulk Misa creation success | `message` |
| `admin_misa_create` | Statsig | `src/routes/admin/misa/+page.svelte:161`<br>`src/routes/admin/misa/+page.svelte:175`<br>`src/routes/admin/misa/create/+page.server.ts:152`<br>`src/routes/admin/misa/create/+page.server.ts:161`<br>`src/routes/admin/misa/create/+page.server.ts:169`<br>`src/routes/admin/misa/create/+page.server.ts:177`<br>`src/routes/admin/misa/create/+page.server.ts:185`<br>`src/routes/admin/misa/create/+page.server.ts:194`<br>`src/routes/admin/misa/create/+page.server.ts:231`<br>`src/routes/admin/misa/create/+page.svelte:59`<br>`src/routes/admin/misa/create/+page.svelte:75`<br>`src/routes/admin/settings/misa/+page.server.ts:87` | Track Misa creation (success/error) | `error`, `error_field`, `error_type`, `event_type`, `message`, `church_id` |
| `admin_misa_create_submit` | PostHog | `src/routes/admin/misa/create/+page.svelte:256` | Track creation events | None |
| `admin_misa_create_success` | PostHog | `src/routes/admin/misa/create/+page.svelte:60` | Track bulk Misa creation success | `message` |
| `admin_posisi_detail_create` | Statsig | `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:183` | Track creation events | `mass_id`, `zone_id`, `position_name`, `position_type` |
| `admin_posisi_detail_delete` | Statsig | `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:374` | Track jadwal detail page views | `position_id` |
| `admin_posisi_detail_edit` | Statsig | `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:312` | Track jadwal detail page views | `position_id` |
| `admin_posisi_detail_reorder` | Statsig + PostHog | `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:460`<br>`src/routes/admin/settings/data-posisi/[id]/+page.svelte:571`<br>`src/routes/admin/settings/data-posisi/[id]/+page.svelte:576` | Track jadwal detail page views | `zone_id`, `item_count`, `direction` |
| `admin_roster_create` | Statsig | `src/routes/admin/tatib/[id]/+page.server.ts:120` | Track creation events | `event_id`, `roster_id`, `community_count` |
| `admin_roster_create_manual` | Statsig | `src/routes/admin/roster/+page.server.ts:113` | Track creation events | `event_id`, `roster_id`, `community_count` |
| `admin_section_create` | Statsig | `src/routes/admin/settings/seksi/+page.server.ts:40` | Track creation events | `church_id`, `event_type` |
| `admin_station_create` | Statsig | `src/routes/admin/settings/titik-tugas/+page.server.ts:44` | Track creation events | `church_id`, `event_type` |
| `admin_struktur_seksi_create` | Statsig | `src/routes/admin/settings/struktur/+page.server.ts:97` | Track creation events | `church_id`, `event_type` |
| `admin_struktur_station_create` | Statsig | `src/routes/admin/settings/struktur/+page.server.ts:253` | Track creation events | `church_id`, `event_type` |
| `admin_struktur_zona_create` | Statsig | `src/routes/admin/settings/struktur/+page.server.ts:174` | Track creation events | `church_id`, `event_type` |
| `admin_user_create` | Statsig | `src/routes/admin/settings/user/+page.server.ts:87` | Track creation events | `church_id`, `event_type` |
| `admin_wilayah_create` | Statsig | `src/routes/admin/settings/wilayah/+page.server.ts:83` | Track creation events | `church_id`, `event_type` |
| `admin_zone_misa_create` | Statsig | `src/routes/admin/settings/data-misa/+page.server.ts:81` | Track creation events | `church_id`, `event_type` |
| `admin_zone_misa_zona_create` | Statsig | `src/routes/admin/settings/data-zona-misa/+page.server.ts:82` | Track creation events | `mass_id`, `zone_id`, `event_type` |
| `admin_zone_new_create` | Statsig | `src/routes/admin/settings/zona/+page.server.ts:41` | Track creation events | `church_id`, `event_type` |
| `admin_zone_zona_create` | Statsig | `src/routes/admin/settings/data-zona/+page.server.ts:83` | Track creation events | `church_id`, `event_type` |
| `admin_zone_zona_group_create` | Statsig | `src/routes/admin/settings/data-zona-group/+page.server.ts:78` | Track creation events | `church_id`, `event_type` |
| `tatib_success` | PostHog | `src/routes/f/tatib/+page.svelte:101` | Track user interaction | None |

### Errors

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_error` | Statsig | `src/routes/admin/tatib/+page.server.ts:111` | Track errors and failures | `event_type` |
| `admin_misa_bulk_create_error` | PostHog | `src/routes/admin/misa/+page.svelte:180` | Track errors and failures | `error` |
| `admin_misa_create_error` | Statsig + PostHog | `src/routes/admin/misa/create/+page.server.ts:114`<br>`src/routes/admin/misa/create/+page.server.ts:130`<br>`src/routes/admin/misa/create/+page.server.ts:255`<br>`src/routes/admin/misa/create/+page.svelte:78` | Track data fetch failures | `error_type`, `error_message`, `event_type`, `error` |
| `admin_misa_create_validation_error` | PostHog | `src/routes/admin/misa/create/+page.svelte:129`<br>`src/routes/admin/misa/create/+page.svelte:145`<br>`src/routes/admin/misa/create/+page.svelte:160`<br>`src/routes/admin/misa/create/+page.svelte:175`<br>`src/routes/admin/misa/create/+page.svelte:190` | Track data fetch failures | `error_field`, `error_type` |
| `admin_posisi_error` | Statsig | `src/routes/admin/settings/data-posisi/+page.server.ts:47` | Track errors and failures | `event_type` |
| `lingkungan_titik_tugas_error` | Statsig | `src/routes/lingkungan/+page.server.ts:53`<br>`src/routes/lingkungan/+page.server.ts:100` | Track errors and failures | `event_type` |
| `tatib_error` | Statsig + PostHog | `src/routes/f/tatib/+page.server.ts:243`<br>`src/routes/f/tatib/+page.server.ts:412`<br>`src/routes/f/tatib/+page.server.ts:458`<br>`src/routes/f/tatib/+page.server.ts:483`<br>`src/routes/f/tatib/+page.server.ts:521`<br>`src/routes/f/tatib/+page.server.ts:539`<br>`src/routes/f/tatib/+page.server.ts:558`<br>`src/routes/f/tatib/+page.server.ts:580`<br>`src/routes/f/tatib/+page.server.ts:601`<br>`src/routes/f/tatib/+page.server.ts:630`<br>`src/routes/f/tatib/+page.server.ts:642`<br>`src/routes/f/tatib/+page.server.ts:655`<br>`src/routes/f/tatib/+page.server.ts:668`<br>`src/routes/f/tatib/+page.server.ts:689`<br>`src/routes/f/tatib/+page.server.ts:714`<br>`src/routes/f/tatib/+page.server.ts:773`<br>`src/routes/f/tatib/+page.svelte:200`<br>`src/routes/f/tatib/+page.svelte:87`<br>`src/routes/f/tatib/+page.svelte:206` | Track errors and failures | `event_type` |
| `tatib_new_error` | Statsig | `src/routes/f/tatib/+page.server.ts:363`<br>`src/routes/f/tatib/+page.server.ts:369` | Track errors and failures | `event_type` |

### Empty States

| Event Name | Platform | Location | Purpose | Metadata |
|------------|----------|----------|---------|----------|
| `admin_jadwal_empty` | PostHog | `src/routes/admin/tatib/+page.svelte:76` | Track completely empty page state | `has_past_events` |
| `admin_jadwal_empty_filter` | PostHog | `src/routes/admin/tatib/+page.svelte:62` | Track empty filter results | None |
| `lingkungan_titik_tugas_empty_events` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:86` | Track completely empty page state | `has_selected_date` |
| `lingkungan_titik_tugas_empty_filter` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:95` | Track empty filter results | `filter`, `total_ushers`, `total_groups`, `u` |
| `lingkungan_titik_tugas_empty_filtered` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:89` | Track empty filter results | `selected_date`, `total_events` |
| `lingkungan_titik_tugas_empty_ushers` | PostHog | `src/routes/lingkungan/LingkunganTitikTugas.svelte:92` | Track completely empty page state | `event_id`, `has_events` |

---

## Event Details

### admin_church_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/gereja/+page.server.ts:80`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `church_id`: Church Id
  - `requires_special_collection`: Requires Special Collection
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_church_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/gereja/+page.server.ts:50`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_dashboard_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/+page.server.ts:25`
  - Client: `src/routes/admin/+page.svelte:20`, `src/routes/admin/+page.svelte:21`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
  - `page`: Page
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_cetak_download
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/tatib/[id]/cetak/+page.svelte:41`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_id`: Event Id
  - `mass`: Mass
  - `date`: Date
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_cetak_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/cetak/+page.server.ts:32`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_detail_deactivate
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/+page.server.ts:283`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `event_id`: Event Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_detail_pic_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/+page.server.ts:316`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_detail_snapshot_download
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/jadwal/JadwalKonfirmasiDetail.svelte:50`, `src/components/jadwal/JadwalKonfirmasiDetail.svelte:51`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_detail_usher_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/+page.server.ts:344`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_detail_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/+page.server.ts:67`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_empty
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/tatib/+page.svelte:76`
- **Purpose**: Track completely empty page state
- **Metadata**: 
  - `has_past_events`: Has Past Events
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_empty_filter
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/tatib/+page.svelte:62`
- **Purpose**: Track empty filter results
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_error
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/+page.server.ts:111`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_event_navigate
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/tatib/+page.svelte:118`
- **Purpose**: Track navigation events
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_filter
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/routes/admin/tatib/+page.svelte:94`
- **Purpose**: Track filter change interactions
- **Metadata**: 
  - `previous_filter`: Previous Filter
  - `new_filter`: New Filter
  - `filtered_count`: Filtered Count
  - `total_count`: Total Count
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_filter_change
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/tatib/+page.svelte:102`
- **Purpose**: Track filter changes with business context
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_jadwal_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/tatib/+page.server.ts:179`
  - Client: `src/routes/admin/tatib/+page.svelte:147`, `src/routes/admin/tatib/+page.svelte:148`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_lingkungan_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/lingkungan/+page.server.ts:87`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_lingkungan_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/lingkungan/+page.server.ts:149`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `community_id`: Community Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_lingkungan_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/lingkungan/+page.server.ts:123`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `community_id`: Community Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_lingkungan_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/lingkungan/+page.server.ts:58`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_misa_bulk_create_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:99`
- **Purpose**: Track creation events
- **Metadata**: 
  - `next_month_start`: Next Month Start
  - `next_month_end`: Next Month End
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_bulk_create_error
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:180`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `error`: Error
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_bulk_create_success
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:164`
- **Purpose**: Track bulk Misa creation success
- **Metadata**: 
  - `message`: Message
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/misa/create/+page.server.ts:152`, `src/routes/admin/misa/create/+page.server.ts:161`, `src/routes/admin/misa/create/+page.server.ts:169`, `src/routes/admin/misa/create/+page.server.ts:177`, `src/routes/admin/misa/create/+page.server.ts:185`, `src/routes/admin/misa/create/+page.server.ts:194`, `src/routes/admin/misa/create/+page.server.ts:231`, `src/routes/admin/settings/misa/+page.server.ts:87`
  - Client: `src/routes/admin/misa/+page.svelte:161`, `src/routes/admin/misa/+page.svelte:175`, `src/routes/admin/misa/create/+page.svelte:59`, `src/routes/admin/misa/create/+page.svelte:75`
- **Purpose**: Track Misa creation (success/error)
- **Metadata**: 
  - `error`: Error
  - `error_field`: Error Field
  - `error_type`: Error Type
  - `event_type`: Event Type
  - `message`: Message
  - `church_id`: Church Id
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_create_button_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:265`
- **Purpose**: Track creation events
- **Metadata**: 
  - `source`: Source
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_create_error
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/misa/create/+page.server.ts:114`, `src/routes/admin/misa/create/+page.server.ts:130`, `src/routes/admin/misa/create/+page.server.ts:255`
  - Client: `src/routes/admin/misa/create/+page.svelte:78`
- **Purpose**: Track data fetch failures
- **Metadata**: 
  - `error_type`: Error Type
  - `error_message`: Error Message
  - `event_type`: Event Type
  - `error`: Error
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_misa_create_submit
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/create/+page.svelte:256`
- **Purpose**: Track creation events
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_create_success
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/create/+page.svelte:60`
- **Purpose**: Track bulk Misa creation success
- **Metadata**: 
  - `message`: Message
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_create_validation_error
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/create/+page.svelte:129`, `src/routes/admin/misa/create/+page.svelte:145`, `src/routes/admin/misa/create/+page.svelte:160`, `src/routes/admin/misa/create/+page.svelte:175`, `src/routes/admin/misa/create/+page.svelte:190`
- **Purpose**: Track data fetch failures
- **Metadata**: 
  - `error_field`: Error Field
  - `error_type`: Error Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_create_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/misa/create/+page.server.ts:70`
  - Client: `src/routes/admin/misa/create/+page.svelte:47`, `src/routes/admin/misa/create/+page.svelte:48`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_misa_date_filter_used
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:70`
- **Purpose**: Track filter change interactions
- **Metadata**: 
  - `selected_date`: Selected Date
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/misa/+page.server.ts:155`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `mass_id`: Mass Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_misa_edit_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/misa/+page.svelte:362`
- **Purpose**: Track button/link clicks
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_misa_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/misa/+page.server.ts:125`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `mass_id`: Mass Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_misa_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/settings/misa/+page.server.ts:55`
  - Client: `src/routes/admin/misa/+page.svelte:154`, `src/routes/admin/misa/+page.svelte:155`, `src/routes/admin/settings/misa/+page.svelte:123`, `src/routes/admin/settings/misa/+page.svelte:124`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_parish_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/paroki/+page.server.ts:93`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `parish_id`: Parish Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_parish_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/paroki/+page.server.ts:61`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/+page.server.ts:89`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `mass_id`: Mass Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_detail_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:183`
- **Purpose**: Track creation events
- **Metadata**: 
  - `mass_id`: Mass Id
  - `zone_id`: Zone Id
  - `position_name`: Position Name
  - `position_type`: Position Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_detail_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:374`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `position_id`: Position Id
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_detail_edit
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:312`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `position_id`: Position Id
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_detail_reorder
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:460`
  - Client: `src/routes/admin/settings/data-posisi/[id]/+page.svelte:571`, `src/routes/admin/settings/data-posisi/[id]/+page.svelte:576`
- **Purpose**: Track jadwal detail page views
- **Metadata**: 
  - `zone_id`: Zone Id
  - `item_count`: Item Count
  - `direction`: Direction
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_detail_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/[id]/+page.server.ts:75`
- **Purpose**: Track page loads
- **Metadata**: 
  - `ppg_enabled`: Ppg Enabled
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_edit_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/admin/settings/data-posisi/+page.svelte:103`
- **Purpose**: Track button/link clicks
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### admin_posisi_error
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/+page.server.ts:47`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_posisi_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/settings/data-posisi/+page.server.ts:63`
  - Client: `src/routes/admin/settings/data-posisi/+page.svelte:142`, `src/routes/admin/settings/data-posisi/+page.svelte:143`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_roster_confirm_entry
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/+page.server.ts:180`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `roster_id`: Roster Id
  - `community_id`: Community Id
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_roster_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/+page.server.ts:120`
- **Purpose**: Track creation events
- **Metadata**: 
  - `event_id`: Event Id
  - `roster_id`: Roster Id
  - `community_count`: Community Count
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_roster_create_manual
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/roster/+page.server.ts:113`
- **Purpose**: Track creation events
- **Metadata**: 
  - `event_id`: Event Id
  - `roster_id`: Roster Id
  - `community_count`: Community Count
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_roster_reopen_entry
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/tatib/[id]/+page.server.ts:238`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `roster_id`: Roster Id
  - `community_id`: Community Id
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_roster_upload
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/roster/+page.server.ts:338`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_section_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/seksi/+page.server.ts:40`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_section_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/seksi/+page.server.ts:99`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `section_id`: Section Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_section_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/seksi/+page.server.ts:73`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `section_id`: Section Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_station_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/titik-tugas/+page.server.ts:44`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_station_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/titik-tugas/+page.server.ts:107`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `station_id`: Station Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_station_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/titik-tugas/+page.server.ts:81`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `station_id`: Station Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_seksi_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:97`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_seksi_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:148`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `section_id`: Section Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_seksi_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:125`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `section_id`: Section Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_station_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:253`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_station_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:306`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `station_id`: Station Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_station_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:283`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `station_id`: Station Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:69`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_zona_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:174`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_zona_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:225`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_id`: Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_struktur_zona_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/struktur/+page.server.ts:202`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_id`: Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_user_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/user/+page.server.ts:87`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_user_deactivate
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/user/+page.server.ts:142`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `user_id`: User Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_user_reactivate
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/user/+page.server.ts:167`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `user_id`: User Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_user_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/user/+page.server.ts:117`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `user_id`: User Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_user_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/user/+page.server.ts:57`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_wilayah_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/wilayah/+page.server.ts:83`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_wilayah_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/wilayah/+page.server.ts:145`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `wilayah_id`: Wilayah Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_wilayah_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/wilayah/+page.server.ts:119`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `wilayah_id`: Wilayah Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_wilayah_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/wilayah/+page.server.ts:55`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_misa_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-misa/+page.server.ts:81`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_misa_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-misa/+page.server.ts:149`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `mass_id`: Mass Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_misa_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-misa/+page.server.ts:119`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `mass_id`: Mass Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_misa_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/settings/data-misa/+page.server.ts:49`
  - Client: `src/routes/admin/settings/data-misa/+page.svelte:123`, `src/routes/admin/settings/data-misa/+page.svelte:124`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_misa_zona_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona-misa/+page.server.ts:82`
- **Purpose**: Track creation events
- **Metadata**: 
  - `mass_id`: Mass Id
  - `zone_id`: Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_misa_zona_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona-misa/+page.server.ts:112`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `mass_zone_id`: Mass Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_misa_zona_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona-misa/+page.server.ts:54`
  - Client: `src/routes/admin/settings/data-zona-misa/+page.svelte:96`, `src/routes/admin/settings/data-zona-misa/+page.svelte:97`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_new_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/zona/+page.server.ts:41`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_new_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/zona/+page.server.ts:101`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_id`: Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_new_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/zona/+page.server.ts:75`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_id`: Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_v2_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/zone/+page.server.ts:61`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona/+page.server.ts:83`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona/+page.server.ts:150`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_id`: Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_group_create
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona-group/+page.server.ts:78`
- **Purpose**: Track creation events
- **Metadata**: 
  - `church_id`: Church Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_group_delete
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona-group/+page.server.ts:144`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_group_id`: Zone Group Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_group_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona-group/+page.server.ts:114`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_group_id`: Zone Group Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_group_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona-group/+page.server.ts:49`
  - Client: `src/routes/admin/settings/data-zona-group/+page.svelte:103`, `src/routes/admin/settings/data-zona-group/+page.svelte:104`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_update
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona/+page.server.ts:120`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `zone_id`: Zone Id
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### admin_zone_zona_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/admin/settings/data-zona/+page.server.ts:53`
  - Client: `src/routes/admin/settings/data-zona/+page.svelte:106`, `src/routes/admin/settings/data-zona/+page.svelte:107`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### button_clicked
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/components/PostHogDemo.svelte:12`, `src/lib/application/PostHogService.ts:702`, `src/lib/utils/analytics.ts:29`
- **Purpose**: Track button/link clicks
- **Metadata**: 
  - `button_name`: Button Name
  - `action`: Action
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### custom_event
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/components/PostHogDemo.svelte:27`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### event_name
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/lib/application/PostHogService.ts:164`, `src/lib/server/posthogNode.ts:38`, `src/lib/utils/analytics.ts:19`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_type`: Event Type
  - `prop`: Prop
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### footer_external_link
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/components/Footer.svelte:27`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### footer_external_link_click
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/components/Footer.svelte:35`
- **Purpose**: Track external link clicks
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### home_feature_click
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/+page.svelte:44`, `src/routes/+page.svelte:50`
- **Purpose**: Track feature navigation
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### home_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/+page.svelte:23`, `src/routes/+page.svelte:24`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### home_view_server
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/+page.server.ts:27`
- **Purpose**: Track page server-side loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_copy_roster
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/UsherDutyTable.svelte:72`, `src/routes/lingkungan/UsherDutyTable.svelte:78`
- **Purpose**: Track copy titik tugas button clicks
- **Metadata**: 
  - `usher_count`: Usher Count
  - `group_count`: Group Count
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_date_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:130`, `src/routes/lingkungan/LingkunganTitikTugas.svelte:136`
- **Purpose**: Track date selection in lingkungan page
- **Metadata**: 
  - `date`: Date
  - `previous_date`: Previous Date
  - `filtered_events_count`: Filtered Events Count
  - `total_events`: Total Events
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_empty_events
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:86`
- **Purpose**: Track completely empty page state
- **Metadata**: 
  - `has_selected_date`: Has Selected Date
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_empty_filter
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:95`
- **Purpose**: Track empty filter results
- **Metadata**: 
  - `filter`: Filter
  - `total_ushers`: Total Ushers
  - `total_groups`: Total Groups
  - `u`: U
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_empty_filtered
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:89`
- **Purpose**: Track empty filter results
- **Metadata**: 
  - `selected_date`: Selected Date
  - `total_events`: Total Events
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_empty_ushers
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:92`
- **Purpose**: Track completely empty page state
- **Metadata**: 
  - `event_id`: Event Id
  - `has_events`: Has Events
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_error
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/lingkungan/+page.server.ts:53`, `src/routes/lingkungan/+page.server.ts:100`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_event_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:109`, `src/routes/lingkungan/LingkunganTitikTugas.svelte:115`
- **Purpose**: Track event selection in lingkungan page
- **Metadata**: 
  - `event_id`: Event Id
  - `previous_event_id`: Previous Event Id
  - `event_date`: Event Date
  - `event_description`: Event Description
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_filter
- **Platforms**: Statsig
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:144`
- **Purpose**: Track filter change interactions
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_filter_change
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:151`
- **Purpose**: Track filter changes with business context
- **Metadata**: 
  - `previous_filter`: Previous Filter
  - `new_filter`: New Filter
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_petunjuk_open
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/lingkungan/LingkunganTitikTugas.svelte:157`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_id`: Event Id
  - `has_selected_event`: Has Selected Event
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### lingkungan_titik_tugas_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/lingkungan/+page.server.ts:32`
  - Client: `src/routes/lingkungan/+page.svelte:23`, `src/routes/lingkungan/+page.svelte:24`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### misa_view_server
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/admin/misa/+page.server.ts:31`
- **Purpose**: Track page server-side loads
- **Metadata**: None
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### server_event
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/lib/utils/analytics.ts:37`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `data`: Data
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_confirm_ushers
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:747`
  - Client: `src/routes/f/tatib/+page.svelte:283`, `src/routes/f/tatib/+page.svelte:289`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### tatib_copy_titik_tugas
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:177`, `src/routes/f/tatib/+page.svelte:182`
- **Purpose**: Track copy titik tugas button clicks
- **Metadata**: 
  - `event_type`: Event Type
  - `action`: Action
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_error
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:243`, `src/routes/f/tatib/+page.server.ts:412`, `src/routes/f/tatib/+page.server.ts:458`, `src/routes/f/tatib/+page.server.ts:483`, `src/routes/f/tatib/+page.server.ts:521`, `src/routes/f/tatib/+page.server.ts:539`, `src/routes/f/tatib/+page.server.ts:558`, `src/routes/f/tatib/+page.server.ts:580`, `src/routes/f/tatib/+page.server.ts:601`, `src/routes/f/tatib/+page.server.ts:630`, `src/routes/f/tatib/+page.server.ts:642`, `src/routes/f/tatib/+page.server.ts:655`, `src/routes/f/tatib/+page.server.ts:668`, `src/routes/f/tatib/+page.server.ts:689`, `src/routes/f/tatib/+page.server.ts:714`, `src/routes/f/tatib/+page.server.ts:773`
  - Client: `src/routes/f/tatib/+page.svelte:200`, `src/routes/f/tatib/+page.svelte:87`, `src/routes/f/tatib/+page.svelte:206`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### tatib_new_error
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:363`, `src/routes/f/tatib/+page.server.ts:369`
- **Purpose**: Track errors and failures
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### tatib_new_submit
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:342`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### tatib_new_view
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:134`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### tatib_regional_date_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:57`, `src/components/Regional.svelte:63`
- **Purpose**: Track date selection in lingkungan page
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_regional_event_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:92`, `src/components/Regional.svelte:98`
- **Purpose**: Track event selection in lingkungan page
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_regional_lingkungan_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:161`, `src/components/Regional.svelte:167`
- **Purpose**: Track selection interactions
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_regional_wilayah_select
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/components/Regional.svelte:127`, `src/components/Regional.svelte:133`
- **Purpose**: Track selection interactions
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_success
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:101`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_ushers_add
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:213`, `src/routes/f/tatib/UshersList.svelte:219`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_ushers_form_ready
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:273`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_ushers_max_limit
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:175`, `src/routes/f/tatib/UshersList.svelte:181`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_ushers_progress
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:260`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_ushers_reset
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:307`, `src/routes/f/tatib/UshersList.svelte:313`
- **Purpose**: Track user interaction
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_ushers_role_change
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/UshersList.svelte:154`, `src/routes/f/tatib/UshersList.svelte:160`
- **Purpose**: Track role change interactions
- **Metadata**: None
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_validate_ushers
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:271`, `src/routes/f/tatib/+page.svelte:277`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_view
- **Platforms**: Statsig + PostHog
- **Locations**: 
  - Client: `src/routes/f/tatib/+page.svelte:222`, `src/routes/f/tatib/+page.svelte:223`
- **Purpose**: Track page loads
- **Metadata**: 
  - `event_type`: Event Type
  - `show_form`: Show Form
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

### tatib_view_server
- **Platforms**: Statsig
- **Locations**: 
  - Server: `src/routes/f/tatib/+page.server.ts:208`
- **Purpose**: Track page server-side loads
- **Metadata**: 
  - `event_type`: Event Type
- **Trigger**: Server-side event
- **Last Updated**: 2026-05-30

### user_action
- **Platforms**: PostHog
- **Locations**: 
  - Client: `src/lib/utils/analytics.ts:33`
- **Purpose**: Track user interaction
- **Metadata**: 
  - `action`: Action
  - `data`: Data
- **Trigger**: Client-side event
- **Last Updated**: 2026-05-30

