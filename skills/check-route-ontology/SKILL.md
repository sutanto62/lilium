---
name: check-route-ontology
description: |
  Validates SvelteKit routes against the domain ontology defined in doc/migrate.md.
  Use this skill whenever a user asks you to check if a route follows the new domain model,
  validate ontology compliance, check a specific route against the ontology, or asks
  "does this follow the domain model?"
  
  The skill analyzes route files (both +page.server.ts and +page.svelte) for deprecated
  entity names (Mass, ChurchEvent, ChurchPosition, ChurchZoneGroup) and suggests canonical
  alternatives (MassSchedule, Celebration, Station, Section). It also verifies that the
  route correctly uses the feature flag pattern (isNewUX && featurePreference) before
  accessing new domain model features.
  
  Provide either a route file path (e.g., "apps/src/routes/admin/settings/misa/") or
  paste the route code directly. The skill will identify violations, explain why each name
  matters per the ontology, and suggest concrete refactoring steps.
---

# Check Route Ontology

## Overview

This skill validates SvelteKit routes against the domain ontology from `doc/migrate.md`. It helps ensure that new routes use canonical entity names and follow the Phase 2+ migration pattern where feature-gated new domain model routes must check both `isNewUX` and `featurePreference`.

## Domain Ontology Rules

The skill checks for four primary renames:

| Deprecated | Canonical | Meaning |
|-----------|-----------|---------|
| `Mass` | `MassSchedule` | Recurring template (day, time, briefing) |
| `ChurchEvent` | `Celebration` | Concrete occurrence on a date |
| `ChurchPosition` | `Station` | Service location within a zone |
| `ChurchZoneGroup` | `Section` | Physical area (Main Nave, Basement) |

These renames are defined in Phase 8 of the migration plan (migrate.md). Routes in the new domain model tier should use canonical names for clarity.

## Feature Gate Pattern

Routes accessing new domain features must check **both conditions**:

```typescript
const { isNewUX, featurePreference } = await event.parent();
if (!isNewUX || featurePreference !== 'new_domain') {
  throw redirect(302, '/old-path');
}
```

The skill verifies this pattern is in place before reporting the route as ontology-compliant.

## Input Format

Provide **either**:
1. **File path** — `apps/src/routes/admin/settings/misa/` or the full path to a route file
2. **Route code** — Paste the `+page.server.ts` and/or `+page.svelte` content directly

## Output Format

The skill generates a structured report with:

### 1. Compliance Summary
- Route path
- Gate pattern status (compliant or not)
- Total violations found
- Severity breakdown (high/medium/low)

### 2. Violations by Type
For each deprecated name found:
- Location (file:line)
- Current usage in context
- Canonical name to use
- Why the rename matters (brief rationale from ontology)

### 3. Refactoring Guide
Step-by-step suggestions to fix violations:
- Import statement changes
- Type annotation updates
- Variable renames
- Any other code adjustments

### 4. Feature Gate Status
If gate pattern is missing or incomplete:
- Which check is missing
- Where to add it
- Template to copy

## Examples

### Example 1: Direct Code Check
**User input:**
```
import type { Mass } from '$core/entities/Schedule';

export const load: PageServerLoad = async (event) => {
  const masses: Mass[] = [];
  // ...
};
```

**Skill output identifies:**
- Line 1: `Mass` import → should be `MassSchedule`
- Line 4: `Mass[]` type → should be `MassSchedule[]`
- Suggests import change and type updates

### Example 2: File Path Check
**User input:** `apps/src/routes/admin/settings/misa/`

**Skill output:**
- Reads both `+page.server.ts` and `+page.svelte`
- Lists all violations with line numbers
- Checks for `isNewUX` + `featurePreference` gate
- Provides consolidated refactoring plan

## Important Notes

- **Backward compatibility**: The `Mass = MassSchedule` type alias means old code still works, but new code should prefer the canonical name.
- **Phase 2 routes**: Only routes explicitly checking `isNewUX && featurePreference !== 'new_domain'` are considered "new domain" routes. Legacy routes at `/admin/settings/data-*` continue using deprecated names.
- **Scope**: The skill focuses on entity names and the feature gate pattern. It doesn't validate other aspects of code quality or functionality.

## When to Use This Skill

✅ **Use it when:**
- Building a new route and want to ensure it follows the ontology
- Reviewing a route for ontology compliance
- Refactoring a route to use new domain model names
- Verifying that a route correctly gates on the new domain feature flag
- Checking if specific code follows `doc/migrate.md` conventions

❌ **Don't use it for:**
- General code review (use code-review skill)
- Performance optimization (use performance-optimization skill)
- Testing (use test-driven-development skill)
- Routes explicitly on the legacy path (these intentionally use old names)
