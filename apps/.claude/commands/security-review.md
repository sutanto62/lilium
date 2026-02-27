Perform a security review of the provided code against this checklist.

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

Report each finding with the file location and a recommended fix.
