# Project Skills

Custom Claude Code skills for the Lilium project. These skills automate domain-specific tasks and enforce project conventions.

## Installation

Skills in this directory are **project-specific**. To use them:

### Claude Code (VS Code Extension / Desktop)
1. Copy the skill directory to `~/.claude/skills/`
2. Restart Claude Code
3. The skill will be available in your Claude conversations

### Claude.ai
1. Install the skill bundle (`.skill` file)
2. Skills are available in the "Skills" menu

## Available Skills

### `check-route-ontology`

Validates SvelteKit routes against the domain ontology defined in `doc/migrate.md`.

**Trigger phrases:**
- "Check if this route follows the domain ontology"
- "Validate this route against the ontology"
- "Does this follow the new domain model?"
- Paste a route file path or code snippet

**What it checks:**
- Deprecated entity names (Mass, ChurchEvent, ChurchPosition, ChurchZoneGroup)
- Feature gate pattern (`isNewUX && featurePreference`)
- Imports and type annotations
- Provides refactoring guidance

**Example:**
```
Check if apps/src/routes/admin/settings/misa/ follows the domain ontology
```

**Output:**
- Compliance summary
- Violations grouped by deprecated term
- Severity levels (high/medium/low)
- Refactoring guide with exact steps

## Adding New Skills

1. Create a new directory: `skills/<skill-name>/`
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: skill-name
   description: When to use this skill and what it does
   ---
   ```
3. Add supporting scripts to `scripts/`
4. Add test cases to `evals/evals.json`
5. Update this README
6. Commit to git

See `check-route-ontology/SKILL.md` for a complete example.

## Setup for Team

To use project skills in Claude Code:

```bash
# Copy all skills to your Claude Code directory
cp -r skills/* ~/.claude/skills/

# Or just one skill
cp -r skills/check-route-ontology ~/.claude/skills/
```

Then restart Claude Code.

## Development

Skills are TypeScript-based and can use any npm packages available in the project. Test cases are defined in `evals/evals.json` using the format:

```json
{
  "skill_name": "example",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected output",
      "files": []
    }
  ]
}
```

## References

- **Domain Ontology:** See `doc/migrate.md` for the migration plan and ontology definitions
- **Phase 8:** The ontology renames are Phase 8 of the migration plan
- **Feature Flags:** Routes using the new domain model must check both `isNewUX` and `featurePreference !== 'new_domain'`
