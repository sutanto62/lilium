# Git Commit Standards

## Conventional Commits Format
Use the conventional commits specification for all commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types
- `feat`: New feature for the user
- `fix`: Bug fix for the user
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD configuration changes
- `build`: Build system or external dependency changes

## Scopes (Optional)
Use kebab-case for scopes:
- `analytics`: Analytics and tracking
- `auth`: Authentication and authorization
- `ui`: User interface components
- `api`: API endpoints and services
- `db`: Database changes
- `config`: Configuration changes

## Description Guidelines
- **Keep it short**: 50 characters or less
- **Explain WHY, not WHAT**: Focus on the business reason or problem solved
- **Use imperative mood**: "add feature" not "added feature"
- **No period at the end**
- **Start with lowercase**

## Breaking Changes
- Add `!` after type/scope: `feat!:` or `feat(api)!:`
- Include `BREAKING CHANGE:` in footer with explanation
- Document what breaks and migration path

## Examples

### Good Commits
```
feat(analytics): enhance event tracking for better user insights
fix(auth): resolve session timeout to prevent data loss
docs: update API guide to reduce support tickets
refactor(ui): simplify component structure for maintainability
perf(db): optimize queries to reduce page load times
test(analytics): add property tests to catch edge cases
```

### Breaking Change Example
```
feat(api)!: restructure user endpoints for better REST compliance

BREAKING CHANGE: User endpoints now use /users/{id} instead of /user/{id}.
Update all API calls to use the new endpoint structure.
```

### Bad Commits (Avoid)
```
fix: fixed bug
feat: added new feature
update: updated files
refactor: refactored code
```

## Body and Footer (When Needed)
- **Body**: Explain the motivation and contrast with previous behavior
- **Footer**: Reference issues, breaking changes, or co-authors
- Separate header from body with blank line
- Wrap body at 72 characters

## Complete Example
```
feat(analytics)!: implement structured event tracking

Replace simple event tracking with structured analytics to enable
better business intelligence and user journey analysis. This supports
data-driven product decisions and personalized user experiences.

BREAKING CHANGE: trackEvent() now requires structured event object
instead of simple string. Use trackStructuredEvent() for new format.

Closes #123
Co-authored-by: Jane Doe <jane@example.com>
```