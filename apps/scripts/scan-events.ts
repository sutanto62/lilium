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

import { readFileSync, readdirSync, statSync } from 'fs';
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
const patterns = [
    // statsigService.logEvent('event_name', ...)
    {
        regex: /statsigService\.logEvent\(['"]([^'"]+)['"]/g,
        platform: 'Statsig' as const
    },
    // posthogService.trackEvent('event_name', ...)
    {
        regex: /posthogService\.trackEvent\(['"]([^'"]+)['"]/g,
        platform: 'PostHog' as const
    },
    // tracker.track('event_name', ...)
    {
        regex: /tracker\.track\(['"]([^'"]+)['"]/g,
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

            // Add location
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

function generateMarkdown(): string {
    const sortedEvents = Array.from(events.values()).sort((a, b) => a.name.localeCompare(b.name));

    let output = `# Event Scanner Results\n\n`;
    output += `**Generated**: ${new Date().toISOString().split('T')[0]}\n`;
    output += `**Total Events**: ${events.size}\n\n`;

    // Group by platform
    const statsigEvents = sortedEvents.filter(e => e.platforms.has('Statsig'));
    const posthogEvents = sortedEvents.filter(e => e.platforms.has('PostHog'));
    const bothEvents = sortedEvents.filter(e => e.platforms.size === 2);

    output += `## Summary\n\n`;
    output += `- **Statsig Only**: ${statsigEvents.length}\n`;
    output += `- **PostHog Only**: ${posthogEvents.length}\n`;
    output += `- **Both Platforms**: ${bothEvents.length}\n\n`;

    output += `## All Events\n\n`;

    for (const event of sortedEvents) {
        const platforms = Array.from(event.platforms).join(' + ');
        const metadata = Array.from(event.metadata).join(', ') || 'None';

        output += `### ${event.name}\n`;
        output += `- **Platforms**: ${platforms}\n`;
        output += `- **Locations**: ${event.locations.length}\n`;
        output += `- **Metadata**: ${metadata}\n\n`;

        for (const location of event.locations) {
            output += `  - \`${location.file}:${location.line}\` (${location.platform}, ${location.context})\n`;
        }

        output += `\n`;
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
        require('fs').writeFileSync(outputFile, output, 'utf-8');
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

