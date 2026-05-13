---
name: security-review
description: >
  Run a security review of SvelteKit code against this project's security standards.
  Trigger this skill whenever the user shares, writes, or asks you to review any SvelteKit
  route, server action, hook, or form — even if they don't mention security explicitly.
  Common triggers: "does this look good?", "review this route", "I added a new page",
  "is this correct?", any code touching +page.server.ts, hooks.server.ts, form actions,
  session/role checks, environment variables, or input handling. When in doubt, run it —
  a false positive is far cheaper than a missed vulnerability.
---

Review the provided code against this security checklist. Work through each section, flag every violation with its file location, and suggest a concrete fix. Skip sections that clearly don't apply (e.g. no cookies in the diff → skip Cookies).

## Authentication & Authorization
- [ ] Session validated before accessing protected resources (`event.locals.auth()`)
- [ ] Unregistered users redirected appropriately
- [ ] Role checks use `hasRole(session, 'admin')` from `$src/auth`
- [ ] Form actions also validate role (not just load functions)
- [ ] Public routes (`/f/*`) still validate inputs

## Environment Variables & Secrets
- [ ] No secrets stored in `VITE_` prefixed variables (they are exposed to the client)
- [ ] Server-only secrets use `process.env` in `.server.ts` files only
- [ ] Secret env vars validated at startup (length, presence)

## Input Validation
- [ ] All form inputs validated and sanitized before use
- [ ] Numeric conversions checked with `isNaN()`
- [ ] String inputs checked for type (`typeof x !== 'string'`) and empty values
- [ ] No unsanitized `{@html}` in Svelte templates

## Database Security
- [ ] All queries use Drizzle ORM (no raw SQL string interpolation)
- [ ] No user input directly concatenated into queries

## Cookies & Sessions
- [ ] Cookies set with `httpOnly: true`, `sameSite: 'strict'`, `secure: true`

## Error Handling
- [ ] Error messages shown to users do not expose stack traces or internal details
- [ ] Sensitive data (passwords, tokens, full user objects) never logged
- [ ] `dev` flag used to conditionally expose stack traces in development only

## HTTP Security Headers (in `src/hooks.server.ts`)
- [ ] `Content-Security-Policy` configured
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Strict-Transport-Security` set
- [ ] `Referrer-Policy` set

## CSRF
- [ ] Form submissions use SvelteKit form actions (not direct `fetch` POST to API routes)

## Dependencies
- [ ] `npm audit` clean (no high/critical vulnerabilities)

## Reporting format

For each finding, report:
```
🔴 HIGH / 🟡 MEDIUM / 🟢 LOW  — [Section]
File: src/routes/admin/...
Issue: <what's wrong>
Fix:
  // corrected code snippet
```

If no issues are found, say: "✅ No security issues found in the reviewed code."
