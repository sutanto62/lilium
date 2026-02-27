Review the staged git changes and create a conventional commit message.

Follow these rules:
- Format: `<type>[optional scope]: <description>`
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize the first letter
- No dot (.) at the end
- Keep subject line under 72 characters
- Include a body that describes the **reason** for the changes

**Commit Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Other changes that don't modify src or test files

**Example:**
```
feat(jadwal): add bulk create usher schedule

Allows admins to assign multiple ushers to a single event in one action,
reducing manual effort for large events.
```

Run `git diff --staged` to inspect the changes, then propose a commit message.
