#!/usr/bin/env tsx
/**
 * analyze_route.ts
 *
 * Analyzes a SvelteKit route for ontology compliance against migrate.md rules.
 * Checks for deprecated entity names and verifies feature gate pattern.
 */

import fs from 'fs';
import path from 'path';

interface OntologyRule {
	deprecated: string;
	canonical: string;
	description: string;
}

interface Violation {
	file: string;
	line: number;
	column: number;
	deprecated: string;
	canonical: string;
	context: string;
	severity: 'high' | 'medium' | 'low';
}

interface GateCheckResult {
	hasIsNewUX: boolean;
	hasFeaturePreference: boolean;
	isCompliant: boolean;
	location?: string;
}

interface AnalysisResult {
	routePath: string;
	files: string[];
	gateStatus: GateCheckResult;
	violations: Violation[];
	summary: {
		total: number;
		high: number;
		medium: number;
		low: number;
	};
}

const ONTOLOGY_RULES: OntologyRule[] = [
	{
		deprecated: 'Mass',
		canonical: 'MassSchedule',
		description: 'Recurring schedule template (day, time, briefing). Mass is now an alias for backward compat.',
	},
	{
		deprecated: 'ChurchEvent',
		canonical: 'Celebration',
		description: 'Concrete occurrence on a date. ChurchEvent is overly generic.',
	},
	{
		deprecated: 'ChurchPosition',
		canonical: 'Station',
		description: 'Service location within a zone. Position collides with liturgical postures.',
	},
	{
		deprecated: 'ChurchZoneGroup',
		canonical: 'Section',
		description: 'Physical area of church (Main Nave, Basement, etc). ZoneGroup is mechanical.',
	},
];

function checkGatePattern(content: string): GateCheckResult {
	const hasIsNewUX = /isNewUX/m.test(content);
	const hasFeaturePreference = /featurePreference\s*(?:===|!==|===)\s*['"]new_domain['"]/.test(content);
	const combinedPattern = /if\s*\(\s*!isNewUX\s*\|\|\s*featurePreference\s*!==\s*['"]new_domain['"]/.test(
		content,
	);

	const lines = content.split('\n');
	let location: string | undefined;
	lines.forEach((line, idx) => {
		if (combinedPattern && line.includes('if') && (line.includes('isNewUX') || line.includes('featurePreference'))) {
			location = `line ${idx + 1}`;
		}
	});

	return {
		hasIsNewUX,
		hasFeaturePreference,
		isCompliant: combinedPattern,
		location,
	};
}

function analyzeContent(content: string, fileName: string): Violation[] {
	const violations: Violation[] = [];
	const lines = content.split('\n');

	lines.forEach((line, lineIdx) => {
		ONTOLOGY_RULES.forEach((rule) => {
			// Match as whole word (not part of other identifiers)
			const regex = new RegExp(`\\b${rule.deprecated}\\b`);

			if (regex.test(line)) {
				// Skip if it's in a comment or string
				if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
					return;
				}

				const columnIdx = line.indexOf(rule.deprecated);
				if (columnIdx === -1) return;

				// Determine severity based on context
				let severity: 'high' | 'medium' | 'low' = 'medium';
				if (line.includes('import')) severity = 'high'; // Import statements should be fixed first
				if (line.includes('type') && line.includes(rule.deprecated)) severity = 'high';
				if (line.includes(':') && line.includes(rule.deprecated)) severity = 'high'; // Type annotations
				if (line.includes('as')) severity = 'low'; // Type casts are lower priority

				violations.push({
					file: fileName,
					line: lineIdx + 1,
					column: columnIdx + 1,
					deprecated: rule.deprecated,
					canonical: rule.canonical,
					context: line.trim(),
					severity,
				});
			}
		});
	});

	return violations;
}

function formatReport(result: AnalysisResult): string {
	let report = '';

	// Header
	report += `# Route Ontology Analysis\n\n`;
	report += `**Route:** ${result.routePath}\n`;
	report += `**Files Analyzed:** ${result.files.join(', ')}\n\n`;

	// Gate Status
	report += `## Feature Gate Status\n`;
	if (result.gateStatus.isCompliant) {
		report += `✅ **Compliant** — Route correctly gates on \`isNewUX && featurePreference === 'new_domain'\`\n`;
		if (result.gateStatus.location) {
			report += `   Located at ${result.gateStatus.location}\n`;
		}
	} else {
		report += `❌ **Non-Compliant** — Missing or incomplete feature gate\n`;
		if (!result.gateStatus.hasIsNewUX) {
			report += `   - Missing check for \`isNewUX\`\n`;
		}
		if (!result.gateStatus.hasFeaturePreference) {
			report += `   - Missing check for \`featurePreference !== 'new_domain'\`\n`;
		}
	}
	report += `\n`;

	// Summary
	report += `## Violations Summary\n`;
	report += `- **Total:** ${result.summary.total}\n`;
	report += `- **High Severity:** ${result.summary.high}\n`;
	report += `- **Medium Severity:** ${result.summary.medium}\n`;
	report += `- **Low Severity:** ${result.summary.low}\n\n`;

	if (result.violations.length === 0) {
		report += `✅ No ontology violations found!\n\n`;
		return report;
	}

	// Group by deprecated name
	const grouped = new Map<string, Violation[]>();
	result.violations.forEach((v) => {
		if (!grouped.has(v.deprecated)) {
			grouped.set(v.deprecated, []);
		}
		grouped.get(v.deprecated)!.push(v);
	});

	// Violations by type
	report += `## Violations by Type\n\n`;
	for (const [deprecated, violations] of grouped) {
		const rule = ONTOLOGY_RULES.find((r) => r.deprecated === deprecated)!;
		report += `### \`${deprecated}\` → \`${rule.canonical}\`\n`;
		report += `${rule.description}\n\n`;

		// Group by severity
		const bySeverity = {
			high: violations.filter((v) => v.severity === 'high'),
			medium: violations.filter((v) => v.severity === 'medium'),
			low: violations.filter((v) => v.severity === 'low'),
		};

		for (const [severity, sevViolations] of Object.entries(bySeverity)) {
			if (sevViolations.length === 0) continue;
			report += `**${severity.toUpperCase()}** (${sevViolations.length}):\n`;

			sevViolations.forEach((v) => {
				report += `\`${v.file}:${v.line}:${v.column}\`\n`;
				report += `\`\`\`\n${v.context}\n\`\`\`\n`;
			});
			report += `\n`;
		}
	}

	// Refactoring guide
	report += `## Refactoring Guide\n\n`;
	for (const [deprecated, violations] of grouped) {
		const rule = ONTOLOGY_RULES.find((r) => r.deprecated === deprecated)!;
		const imports = violations.filter((v) => v.context.includes('import'));

		if (imports.length > 0) {
			report += `### Step 1: Update imports\n`;
			report += `Find:\n\`\`\`typescript\nimport type { ${deprecated} } from '$core/entities/Schedule';\n\`\`\`\n`;
			report += `Replace with:\n\`\`\`typescript\nimport type { ${rule.canonical} } from '$core/entities/Schedule';\n\`\`\`\n\n`;
		}

		const types = violations.filter((v) => v.context.includes(':') && v.context.includes(deprecated));
		if (types.length > 0) {
			report += `### Step 2: Update type annotations\n`;
			report += `Replace all instances of \`${deprecated}\` in type positions with \`${rule.canonical}\`:\n`;
			report += `- \`${deprecated}[]\` → \`${rule.canonical}[]\`\n`;
			report += `- \`: ${deprecated}\` → \`: ${rule.canonical}\`\n`;
			report += `- \`Omit<${deprecated}, ...>\` → \`Omit<${rule.canonical}, ...>\`\n\n`;
		}
	}

	// Gate pattern template
	if (!result.gateStatus.isCompliant) {
		report += `### Add Feature Gate\n`;
		report += `In \`+page.server.ts\` load function:\n`;
		report += `\`\`\`typescript\nexport const load: PageServerLoad = async (event) => {\n`;
		report += `  const { isNewUX, featurePreference } = await event.parent();\n`;
		report += `  if (!isNewUX || featurePreference !== 'new_domain') {\n`;
		report += `    throw redirect(302, '/admin/settings/data-misa');\n`;
		report += `  }\n`;
		report += `  // ... rest of load function\n`;
		report += `};\n\`\`\`\n\n`;
	}

	return report;
}

async function main() {
	const input = process.argv[2];

	if (!input) {
		console.error('Usage: analyze_route.ts <path-or-code>');
		console.error('  Provide a route path (e.g., apps/src/routes/admin/settings/misa/) or code snippet');
		process.exit(1);
	}

	let result: AnalysisResult = {
		routePath: input,
		files: [],
		gateStatus: { hasIsNewUX: false, hasFeaturePreference: false, isCompliant: false },
		violations: [],
		summary: { total: 0, high: 0, medium: 0, low: 0 },
	};

	// Determine if input is a file path or code
	if (input.includes('/src/routes') || fs.existsSync(input) || fs.existsSync(path.join(process.cwd(), input))) {
		// File path
		const resolvedPath = fs.existsSync(input) ? input : path.join(process.cwd(), input);

		if (!fs.existsSync(resolvedPath)) {
			console.error(`Path not found: ${resolvedPath}`);
			process.exit(1);
		}

		const stats = fs.statSync(resolvedPath);
		const filesToCheck: string[] = [];

		if (stats.isDirectory()) {
			// Check for route files
			const serverFile = path.join(resolvedPath, '+page.server.ts');
			const svelteFile = path.join(resolvedPath, '+page.svelte');
			if (fs.existsSync(serverFile)) filesToCheck.push(serverFile);
			if (fs.existsSync(svelteFile)) filesToCheck.push(svelteFile);
		} else if (stats.isFile()) {
			filesToCheck.push(resolvedPath);
		}

		if (filesToCheck.length === 0) {
			console.error('No +page.server.ts or +page.svelte found in route directory');
			process.exit(1);
		}

		result.files = filesToCheck;
		let combinedContent = '';

		filesToCheck.forEach((file) => {
			const content = fs.readFileSync(file, 'utf-8');
			combinedContent += content + '\n';

			const fileViolations = analyzeContent(content, path.relative(process.cwd(), file));
			result.violations.push(...fileViolations);
		});

		result.gateStatus = checkGatePattern(combinedContent);
	} else {
		// Treat as code snippet
		result.files = ['<pasted-code>'];
		result.violations = analyzeContent(input, '<pasted-code>');
		result.gateStatus = checkGatePattern(input);
	}

	// Calculate summary
	result.summary.total = result.violations.length;
	result.summary.high = result.violations.filter((v) => v.severity === 'high').length;
	result.summary.medium = result.violations.filter((v) => v.severity === 'medium').length;
	result.summary.low = result.violations.filter((v) => v.severity === 'low').length;

	// Output report
	const report = formatReport(result);
	console.log(report);

	// Exit with error code if violations found
	if (result.violations.length > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
