# Events Inventory Maintenance Guide

This document provides step-by-step procedures for maintaining the events inventory (`doc/events-inventory.md`).

## Quick Reference

- **Inventory Document**: `doc/events-inventory.md`
- **Scanner Script**: `scripts/scan-events.ts`
- **Run Scanner**: `npm run scan:events`

## Workflow

### Adding New Events

**Before Implementation:**
1. Check `doc/events-inventory.md` for existing similar events
2. Verify naming follows convention: `{page}_{action}_{context}`
3. Ensure no duplicate event names exist

**During Implementation:**
1. Implement tracking code following `.cursor/rules/event-tracking.mdc`
2. Use appropriate platform (Statsig/PostHog/Both)
3. Include rich metadata for business context

**After Implementation:**
1. Update `doc/events-inventory.md` with new event entry
2. Add event to appropriate category table
3. Add detailed event entry in "Event Details" section
4. Update "Last Updated" date at top of document
5. Run scanner to verify: `npm run scan:events`

**Event Entry Template:**
```markdown
### {event_name}
- **Platforms**: Statsig / PostHog / Both
- **Locations**: 
  - Server: `src/routes/path/+page.server.ts:line` (if applicable)
  - Client: `src/routes/path/+page.svelte:line` (if applicable)
- **Purpose**: Brief description of what this event tracks
- **Metadata**: 
  - `field1`: Description
  - `field2`: Description
- **Trigger**: When this event fires (e.g., "Page load", "Filter change", "Button click")
- **Last Updated**: YYYY-MM-DD
```

### Updating Existing Events

**When to Update:**
- Adding new metadata fields
- Changing event location
- Modifying event purpose
- Adding/removing platforms

**Procedure:**
1. Update tracking code
2. Update inventory document entry
3. Update "Last Updated" date in event entry
4. Update "Last Updated" date at top of document
5. Note any breaking changes in metadata

### Removing Deprecated Events

**Procedure:**
1. Remove tracking code from codebase
2. Remove event entry from inventory document
3. Update event count at top of document
4. Run scanner to verify removal: `npm run scan:events`

## Regular Audits

### Monthly Audit Checklist

1. **Run Scanner**
   ```bash
   npm run scan:events > events-scan-$(date +%Y-%m-%d).md
   ```

2. **Compare Results**
   - Compare scanner output with `doc/events-inventory.md`
   - Identify missing events in inventory
   - Identify events in inventory not found in codebase

3. **Update Inventory**
   - Add any missing events
   - Remove deprecated events
   - Update metadata for changed events

4. **Verify Naming**
   - Check all events follow `{page}_{action}_{context}` pattern
   - Flag any inconsistencies

5. **Check Metadata**
   - Verify all events have documented metadata
   - Update metadata descriptions if needed

### Quarterly Review

1. **Review Event Usage**
   - Check analytics dashboards for unused events
   - Identify events with low/no usage
   - Consider deprecating unused events

2. **Review Naming Consistency**
   - Ensure naming patterns are consistent
   - Update any events that don't follow conventions

3. **Review Platform Usage**
   - Verify dual tracking is used appropriately
   - Check PostHog autocapture is leveraged
   - Ensure no redundant manual tracking

## Scanner Script Usage

### Basic Usage

```bash
# Generate markdown report (default)
npm run scan:events
```

### Advanced Usage

```bash
# Generate JSON output
npm run scan:events -- --json

# Save to file
npm run scan:events -- --output events-report-2025-01.md

# Combine with date
npm run scan:events -- --output events-scan-$(date +%Y-%m-%d).md
```

### Interpreting Scanner Output

The scanner output includes:
- **Summary**: Count of events by platform
- **All Events**: Detailed list with locations and metadata

**What to Look For:**
- Events in codebase not in inventory → Add to inventory
- Events in inventory not in codebase → Remove from inventory
- Metadata differences → Update inventory
- Location changes → Update inventory

## Common Scenarios

### Scenario 1: Adding a New Page

1. Check inventory for similar pages
2. Implement page view tracking (server + client)
3. Add events to inventory:
   - `{page}_view` (client)
   - `{page}_view_server` (server)
4. Document metadata and triggers

### Scenario 2: Adding Filter Functionality

1. Check inventory for existing filter patterns
2. Implement filter tracking:
   - Statsig: `{page}_filter` (key event)
   - PostHog: `{page}_filter_change` (business context)
3. Add both events to inventory
4. Document metadata (previous_filter, new_filter, etc.)

### Scenario 3: Adding Error Handling

1. Check inventory for existing error patterns
2. Implement error tracking (Statsig + PostHog)
3. Add `{page}_error` event to inventory
4. Document error metadata (error_type, error_message)

### Scenario 4: Refactoring Event Location

1. Update tracking code
2. Update location in inventory document
3. Update "Last Updated" date
4. Run scanner to verify

## Troubleshooting

### Scanner Not Finding Events

**Possible Causes:**
- Event name uses different quote style
- Event is in test/example file (scanner skips these)
- File extension not included in scan

**Solution:**
- Check scanner patterns in `scripts/scan-events.ts`
- Verify file is in `src/` directory
- Check file extension is `.ts` or `.svelte`

### Inventory Out of Sync

**Symptoms:**
- Scanner finds events not in inventory
- Inventory has events not in codebase

**Solution:**
1. Run scanner: `npm run scan:events`
2. Compare with inventory
3. Update inventory accordingly
4. Document changes

### Duplicate Event Names

**Symptoms:**
- Multiple events with same name
- Scanner shows same event in multiple locations

**Solution:**
- Verify events serve different purposes
- If same purpose, consolidate to one event
- If different purposes, rename to be more specific

## Best Practices

1. **Update Immediately**: Don't wait to update inventory after adding events
2. **Run Scanner Regularly**: Use scanner to catch discrepancies
3. **Document Metadata**: Always document all metadata fields
4. **Be Specific**: Use descriptive event names and purposes
5. **Review Before PR**: Check inventory is updated before submitting PR

## Related Documentation

- [Events Inventory](doc/events-inventory.md) - Main inventory document
- [Event Tracking Rules](.cursor/rules/event-tracking.mdc) - Tracking guidelines
- [Scanner Script](scripts/scan-events.ts) - Automated event extraction

