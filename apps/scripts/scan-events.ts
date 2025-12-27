#!/usr/bin/env node

/**
 * Event Scanner Script
 * 
 * Scans the codebase for analytics event tracking calls and generates
 * a structured inventory of all events.
 * 
 * Usage:
 *   npm run scan:events
 *   tsx scripts/scan-events.ts [--json] [--output <file>]
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

interface EventLocation {
    file: string;
    line: number;
    platform: 'Statsig' | 'PostHog' | 'Both';
    context: 'server' | 'client' | 'both';
    metadata?: string[];
}

interface EventInfo {
    name: string;
    locations: EventLocation[];
    platforms: Set<'Statsig' | 'PostHog'>;
    metadata: Set<string>;
}

const events = new Map<string, EventInfo>();

// Patterns to match event tracking calls
// Note: Using \s* to match optional whitespace/newlines between opening paren and event name
const patterns = [
    // statsigService.logEvent('event_name', ...) - handles multi-line
    {
        regex: /statsigService\.logEvent\(\s*['"]([^'"]+)['"]/g,
        platform: 'Statsig' as const
    },
    // posthogService.trackEvent('event_name', ...) - handles multi-line
    {
        regex: /posthogService\.trackEvent\(\s*['"]([^'"]+)['"]/g,
        platform: 'PostHog' as const
    },
    // tracker.track('event_name', ...) - handles multi-line
    {
        regex: /tracker\.track\(\s*['"]([^'"]+)['"]/g,
        platform: 'PostHog' as const
    }
];

function extractMetadata(content: string, lineNumber: number): string[] {
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];
    const metadata: string[] = [];

    // Try to extract metadata object keys
    const metadataMatch = line.match(/\{[^}]*\}/);
    if (metadataMatch) {
        const metadataStr = metadataMatch[0];
        // Extract keys from object
        const keyMatches = metadataStr.matchAll(/(\w+):/g);
        for (const match of keyMatches) {
            metadata.push(match[1]);
        }
    }

    // Check next few lines for metadata object
    for (let i = 0; i < 5 && lineNumber + i < lines.length; i++) {
        const nextLine = lines[lineNumber + i];
        if (nextLine.includes('}')) {
            const block = lines.slice(lineNumber - 1, lineNumber + i + 1).join('\n');
            const blockMatches = block.matchAll(/(\w+):/g);
            for (const match of blockMatches) {
                if (!metadata.includes(match[1])) {
                    metadata.push(match[1]);
                }
            }
            break;
        }
    }

    return metadata;
}

function scanFile(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = relative(process.cwd(), filePath);

    // Determine context
    const isServer = filePath.includes('+page.server.ts') || filePath.includes('+layout.server.ts');
    const isClient = filePath.includes('+page.svelte') || filePath.includes('+layout.svelte');
    const context: 'server' | 'client' | 'both' = isServer && isClient ? 'both' : isServer ? 'server' : 'client';

    // Scan for each pattern
    for (const pattern of patterns) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;

        while ((match = regex.exec(content)) !== null) {
            const eventName = match[1];
            const lineNumber = content.substring(0, match.index).split('\n').length;

            // Skip test files and example files
            if (filePath.includes('.test.') || filePath.includes('.example.')) {
                continue;
            }

            // Get metadata if available
            const metadata = extractMetadata(content, lineNumber);

            // Initialize event if not exists
            if (!events.has(eventName)) {
                events.set(eventName, {
                    name: eventName,
                    locations: [],
                    platforms: new Set(),
                    metadata: new Set()
                });
            }

            const event = events.get(eventName)!;
            event.platforms.add(pattern.platform);

            // Add metadata
            metadata.forEach(m => event.metadata.add(m));

            // Check if this location already exists (same file:line:platform)
            const locationKey = `${relativePath}:${lineNumber}:${pattern.platform}`;
            const locationExists = event.locations.some(
                loc => `${loc.file}:${loc.line}:${loc.platform}` === locationKey
            );

            // Add location only if it doesn't exist
            if (!locationExists) {
                event.locations.push({
                    file: relativePath,
                    line: lineNumber,
                    platform: pattern.platform,
                    context,
                    metadata: metadata.length > 0 ? metadata : undefined
                });
            }
        }
    }
}

function scanDirectory(dirPath: string, extensions: string[] = ['.ts', '.svelte']): void {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            // Skip node_modules, build, and other non-source directories
            if (
                entry === 'node_modules' ||
                entry === 'build' ||
                entry === '.svelte-kit' ||
                entry === 'drizzle' ||
                entry === 'test-results' ||
                entry === 'logs' ||
                entry.startsWith('.')
            ) {
                continue;
            }
            scanDirectory(fullPath, extensions);
        } else if (stat.isFile()) {
            const ext = entry.substring(entry.lastIndexOf('.'));
            if (extensions.includes(ext)) {
                scanFile(fullPath);
            }
        }
    }
}

type EventCategory = 'Page Views' | 'User Interactions' | 'Business Events' | 'Errors' | 'Empty States' | 'Other';

function categorizeEvent(eventName: string): EventCategory {
    if (eventName.includes('_empty')) {
        return 'Empty States';
    }
    if (eventName.endsWith('_error')) {
        return 'Errors';
    }
    if (eventName.endsWith('_view') || eventName.endsWith('_view_server')) {
        return 'Page Views';
    }
    if (eventName.includes('_filter') || eventName.includes('_navigate') ||
        eventName.includes('_select') || eventName.includes('_click') ||
        eventName.includes('_copy') || eventName.includes('_change')) {
        return 'User Interactions';
    }
    if (eventName.includes('_create') || eventName.includes('_success') ||
        eventName.includes('_detail') || eventName.includes('_bulk')) {
        return 'Business Events';
    }
    return 'Other';
}

function formatPlatforms(platforms: Set<'Statsig' | 'PostHog'>): string {
    if (platforms.size === 2) {
        return 'Statsig + PostHog';
    }
    return Array.from(platforms).join(' + ');
}

function formatLocations(locations: EventLocation[]): string {
    // Group locations by file:line to avoid duplicates
    const locationMap = new Map<string, EventLocation>();
    for (const loc of locations) {
        const key = `${loc.file}:${loc.line}`;
        if (!locationMap.has(key)) {
            locationMap.set(key, loc);
        }
    }
    return Array.from(locationMap.values())
        .map(loc => `\`${loc.file}:${loc.line}\``)
        .join('<br>');
}

function formatMetadata(metadata: Set<string>): string {
    const metadataArray = Array.from(metadata);
    if (metadataArray.length === 0) {
        return 'None';
    }
    // Format as backticked keys, matching inventory format
    return metadataArray.map(key => `\`${key}\``).join(', ');
}

function inferPurpose(eventName: string, metadata: Set<string>, locations: EventLocation[]): string {
    // More specific purpose descriptions matching inventory format
    if (eventName.includes('_view')) {
        if (eventName.includes('_server')) {
            return 'Track page server-side loads';
        }
        if (metadata.has('load_time_ms') || metadata.has('total_events')) {
            return 'Track page loads with performance metrics';
        }
        return 'Track page loads';
    }
    if (eventName.includes('_error')) {
        if (metadata.has('error_type') || metadata.has('error_message')) {
            return 'Track data fetch failures';
        }
        return 'Track errors and failures';
    }
    if (eventName.includes('_empty')) {
        if (eventName.includes('_filter')) {
            return 'Track empty filter results';
        }
        return 'Track completely empty page state';
    }
    if (eventName.includes('_filter')) {
        if (eventName.includes('_change')) {
            return 'Track filter changes with business context';
        }
        return 'Track filter change interactions';
    }
    if (eventName.includes('_navigate')) {
        if (metadata.has('progress_percentage') || metadata.has('event_id')) {
            return 'Track event link clicks with progress context';
        }
        return 'Track navigation events';
    }
    if (eventName.includes('_create')) {
        if (eventName.includes('_success')) {
            return 'Track bulk Misa creation success';
        }
        if (eventName.includes('_error')) {
            return 'Track bulk Misa creation errors';
        }
        if (metadata.has('error')) {
            return 'Track Misa creation (success/error)';
        }
        return 'Track creation events';
    }
    if (eventName.includes('_select')) {
        if (eventName.includes('_date')) {
            return 'Track date selection in lingkungan page';
        }
        if (eventName.includes('_event')) {
            return 'Track event selection in lingkungan page';
        }
        return 'Track selection interactions';
    }
    if (eventName.includes('_click') || eventName.includes('_copy')) {
        if (eventName.includes('_external_link')) {
            return 'Track external link clicks';
        }
        if (eventName.includes('_titik_tugas')) {
            return 'Track copy titik tugas button clicks';
        }
        if (eventName.includes('_feature')) {
            return 'Track feature navigation';
        }
        return 'Track button/link clicks';
    }
    if (eventName.includes('_detail')) {
        return 'Track jadwal detail page views';
    }
    if (eventName.includes('_role_change')) {
        return 'Track role change interactions';
    }
    return 'Track user interaction';
}

function generateMarkdown(): string {
    const sortedEvents = Array.from(events.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Categorize events
    const categories = new Map<EventCategory, EventInfo[]>();
    for (const event of sortedEvents) {
        const category = categorizeEvent(event.name);
        if (!categories.has(category)) {
            categories.set(category, []);
        }
        categories.get(category)!.push(event);
    }

    let output = `# Analytics Events Inventory\n\n`;
    output += `**Last Updated**: ${new Date().toISOString().split('T')[0]}\n`;
    output += `**Total Events**: ${events.size}\n\n`;
    output += `> **Note**: This inventory tracks all analytics events implemented across the codebase. Before adding new events, check this document to avoid duplicates and ensure consistent naming.\n\n`;

    // Quick Reference
    output += `## Quick Reference\n\n`;
    output += `### Event Categories\n`;
    for (const [category, events] of categories.entries()) {
        if (category !== 'Other') {
            output += `- **${category}**: ${events.length} events\n`;
        }
    }
    output += `\n### Platforms\n`;
    output += `- **Statsig**: Server-side and client-side key events\n`;
    output += `- **PostHog**: Business context and autocapture (clicks, pageviews)\n`;
    output += `- **Both**: Dual tracking for critical events\n\n`;
    output += `---\n\n`;

    // Event Categories with Tables
    output += `## Event Categories\n\n`;

    const categoryOrder: EventCategory[] = ['Page Views', 'User Interactions', 'Business Events', 'Errors', 'Empty States'];

    for (const category of categoryOrder) {
        const categoryEvents = categories.get(category) || [];
        if (categoryEvents.length === 0) continue;

        output += `### ${category}\n\n`;
        output += `| Event Name | Platform | Location | Purpose | Metadata |\n`;
        output += `|------------|----------|----------|---------|----------|\n`;

        for (const event of categoryEvents) {
            const platforms = formatPlatforms(event.platforms);
            const locations = formatLocations(event.locations);
            const metadata = formatMetadata(event.metadata);
            const purpose = inferPurpose(event.name, event.metadata, event.locations);

            output += `| \`${event.name}\` | ${platforms} | ${locations} | ${purpose} | ${metadata} |\n`;
        }
        output += `\n`;
    }

    // Event Details Section
    output += `---\n\n`;
    output += `## Event Details\n\n`;

    for (const event of sortedEvents) {
        const platforms = formatPlatforms(event.platforms);
        const serverLocations = event.locations.filter(l => l.context === 'server');
        const clientLocations = event.locations.filter(l => l.context === 'client');
        const metadata = formatMetadata(event.metadata);
        const purpose = inferPurpose(event.name, event.metadata, event.locations);

        output += `### ${event.name}\n`;
        output += `- **Platforms**: ${platforms}\n`;

        if (serverLocations.length > 0 || clientLocations.length > 0) {
            output += `- **Locations**: \n`;
            if (serverLocations.length > 0) {
                output += `  - Server: ${serverLocations.map(l => `\`${l.file}:${l.line}\``).join(', ')}\n`;
            }
            if (clientLocations.length > 0) {
                output += `  - Client: ${clientLocations.map(l => `\`${l.file}:${l.line}\``).join(', ')}\n`;
            }
        }

        output += `- **Purpose**: ${purpose}\n`;

        if (metadata !== 'None') {
            output += `- **Metadata**: \n`;
            const metadataArray = Array.from(event.metadata);
            for (const meta of metadataArray) {
                output += `  - \`${meta}\`: ${meta.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
            }
        } else {
            output += `- **Metadata**: None\n`;
        }

        output += `- **Trigger**: ${event.locations[0]?.context === 'server' ? 'Server-side' : 'Client-side'} event\n`;
        output += `- **Last Updated**: ${new Date().toISOString().split('T')[0]}\n\n`;
    }

    return output;
}

function generateJSON(): string {
    const sortedEvents = Array.from(events.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(event => ({
            name: event.name,
            platforms: Array.from(event.platforms),
            metadata: Array.from(event.metadata),
            locations: event.locations.map(loc => ({
                file: loc.file,
                line: loc.line,
                platform: loc.platform,
                context: loc.context,
                metadata: loc.metadata
            }))
        }));

    return JSON.stringify({ events: sortedEvents, generated: new Date().toISOString() }, null, 2);
}

function main() {
    const args = process.argv.slice(2);
    const outputJson = args.includes('--json');
    const outputIndex = args.indexOf('--output');
    const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : null;

    console.log('Scanning codebase for analytics events...\n');

    // Scan src directory
    scanDirectory(join(process.cwd(), 'src'));

    console.log(`Found ${events.size} unique events\n`);

    // Generate output
    const output = outputJson ? generateJSON() : generateMarkdown();

    // Write to file or stdout
    if (outputFile) {
        writeFileSync(outputFile, output, 'utf-8');
        console.log(`Output written to ${outputFile}`);
    } else {
        console.log(output);
    }

    // Exit with error if no events found (might indicate scanning issue)
    if (events.size === 0) {
        console.error('Warning: No events found. Check if scanning patterns are correct.');
        process.exit(1);
    }
}

main();

