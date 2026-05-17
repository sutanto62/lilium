# CLAUDE.md

Guidance for Claude Code working in this SvelteKit 5 + TypeScript + Drizzle ORM + SQLite app.

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run check            # Type-check (svelte-check)
npm run lint             # ESLint + Prettier check
npm run format           # Format code
npm run scan:events      # Audit analytics events
```

### Database
```bash
npm run db:generate      # Generate migrations after schema changes
npm run db:migrate       # Apply migrations
npm run db:studio        # Drizzle Studio GUI
```
> Never delete migration files manually. Use `npx drizzle-kit drop` to remove generated migrations.

### Testing
```bash
npm run test             # All tests (unit + integration)
npm run test:unit        # Vitest only
npm run test:coverage    # Coverage report
npm run test:integration # Playwright only
```

## Architecture

**Clean Architecture** — dependencies point inward; outer layers depend on inner, never the reverse.

```
src/
├── core/                 # Domain (zero external dependencies)
│   ├── entities/        # Domain models (pure TypeScript)
│   ├── repositories/    # Repository interfaces (ports)
│   └── service/        # Business logic
├── lib/
│   ├── application/    # App services: Statsig, PostHog
│   ├── server/
│   │   ├── adapters/  # Repository implementations (adapters)
│   │   └── db/        # Drizzle schema + setup
│   └── utils/
└── routes/             # Presentation: admin/ (auth required), f/ (public)
```

**Dependency rule**: `routes/` → `service/` → `repositories/` ← `adapters/`. Core never imports from `lib/` or `routes/`.

**Path aliases**: `$core`, `$src`, `$components`, `$adapters`

### Naming by Layer

| Layer | Convention | Example |
|-------|-----------|---------|
| `core/entities/` | PascalCase nouns | `ChurchEvent`, `Mass` |
| `core/service/` | `EntityService`; verbs: `create`, `retrieve`, `list` | `EventService.retrieveEventById()` |
| `core/repositories/` | `EntityRepository`; verbs: `persist`, `find`, `query` | `ScheduleRepository.findEventById()` |
| `lib/server/adapters/` | `TechEntityAdapter` | `SQLiteAdapter` |

### Key Technologies

- **Svelte 5**: runes only — `$props`, `$state`, `$derived`, `$effect`
- **Auth**: `@auth/sveltekit` (Google + Microsoft Entra ID) + CASL authorization
- **DB**: SQLite + Drizzle ORM (WAL mode)
- **Analytics**: Statsig (feature flags, server events) + PostHog (user analytics, autocapture)
- **Testing**: Vitest (unit) + Playwright (e2e)

### DRY & Reusability

- Extract shared logic to services/utilities — never copy-paste across routes or components
- Same entity → one repository interface + one adapter, not per-feature DB access
- Similar code in 2+ places → shared abstraction in the appropriate layer

## Code Conventions

### Svelte 5

**Script section order**: imports → `$props()` → `$state()` → `$derived()` → functions → `$effect()`

**Never use Svelte 4 patterns**: `export let`, `onMount`, stores. Replace with runes.

**`$bindable()` for two-way binding**: `let { value = $bindable<Date | undefined>() } = $props()`

**`$effect` not `onMount`** — `$effect` is reactive and re-runs when dependencies change.

**`use:enhance` callbacks must be `async` when using `await`**:
```svelte
use:enhance={() => { return async ({ update }) => { await update(); }; }}
```

### TypeScript

- No `any` — use `unknown` and narrow with `instanceof` / type guards
- Explicit return types on all public functions and methods
- `interface` for object shapes; `type` for unions, intersections, and utility types
- `import type` for type-only imports
- Boolean names: `is`, `has`, `should`, `can` prefixes
- Handle `null`/`undefined` explicitly — never assume a value is present

**Import order**: external packages → internal modules → path aliases (`$core`, `$src`, etc.)

### Database (Drizzle ORM)

Never use raw SQL — always use Drizzle's type-safe query builder.

```typescript
// Infer types from schema — don't duplicate definitions
type EventRow    = typeof event.$inferSelect;
type EventInsert = typeof event.$inferInsert;

// Soft delete — never hard-delete records
await db.update(event).set({ active: 0 }).where(eq(event.id, id));

// Transactions for multiple related operations
await db.transaction(async (tx) => {
  const created = await createEvent(tx, eventData);
  await persistEventUshers(tx, created.id, ushers);
});
```

**Migration workflow**: edit schema → `db:generate` → `db:migrate`.

### Error Handling

Use `ServiceError` factory methods from `$core/errors/ServiceError.ts`:

```typescript
// Validation
if (!event.church) throw ServiceError.validation('Church ID is required', { field: 'church' });

// Not found
if (!event) throw ServiceError.notFound('Event not found', { id });

// Service boundary — transform DB errors to domain errors
try {
  return await repo.insertEvent(newEvent);
} catch (error) {
  logger.error('EventService.createEvent: Failed', { error });
  if (error instanceof ServiceError) throw error;
  throw ServiceError.unknown('System failed to record event', { originalError: error });
}
```

**Log format**: `FileName.methodName: message` — e.g., `EventService.createEvent: Failed`.
**Never log**: passwords, tokens, or full user objects.

### Analytics

Dual tracking: **Statsig** (server-side + key events) + **PostHog** (client-side + autocapture).

**Event naming**: `{page}_{action}_{context}` in `snake_case`. Metadata keys: `snake_case`.

```typescript
// Server-side: always parallel
await Promise.all([
  statsigService.logEvent('admin_jadwal_view', 'load', session, metadata),
  posthogService.trackEvent('admin_jadwal_view', { event_type: 'page_load', ...metadata }, session)
]);

// Client-side
statsigService.logEvent('admin_jadwal_filter', 'change', session, metadata);
await tracker.track('admin_jadwal_filter_change', metadata, session, page);
```

**PostHog autocapture** handles button clicks, link clicks, page views, and form submissions — **do not manually track these**.

**Track manually**: filter changes (with before/after values), navigation with progress context, empty states, server-side errors and performance metrics.

Check `doc/events-inventory.md` before adding events. Run `npm run scan:events` to audit.

### Security

- Validate session in all protected routes; redirect to `/signin` if missing
- RBAC: `hasRole(session, 'admin')` — public routes (`/f/*`, `/lingkungan`) still require input validation
- `VITE_*` is exposed to the browser — never use for secrets; server-only secrets via `process.env`
- Prefer SvelteKit form actions over raw `fetch` POST — form actions have built-in CSRF protection
- Error messages to users: Indonesian, never expose stack traces in production
- `{@html}` only with sanitized input — Svelte auto-escapes interpolated values

**HTTP security headers** in `src/hooks.server.ts`:
```typescript
response.headers.set('Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://statsig.com https://app.posthog.com; " +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; " +
  "connect-src 'self' https://statsig.com https://app.posthog.com; frame-ancestors 'none';"
);
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
```

**Cookies**: `httpOnly: true, sameSite: 'strict', secure: true` always.

## Adding New Features

1. Define entity in `core/entities/`
2. Define repository interface in `core/repositories/`
3. Implement service in `core/service/`
4. Create DB adapter in `lib/server/adapters/`
5. Update schema → `db:generate` → `db:migrate`
6. Build routes in `routes/`
7. Add analytics tracking (server + client)
8. Write tests (unit: Vitest, e2e: Playwright)

## Git Workflow

[Conventional Commits](https://www.conventionalcommits.org/) — imperative mood, lowercase, no trailing dot, ≤72 chars.

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | No behaviour change |
| `test` | Tests only |
| `chore` | Config, scripts, deps |

## Testing

- **Unit** (`core/service/`): mock repositories with `vi.fn()`, reset with `vi.clearAllMocks()` in `beforeEach`
- **E2E** (Playwright): `test.beforeEach` for navigation, assert with `expect(locator).toBeVisible()`
- Focus coverage on business logic and error paths — don't test implementation details

**Factory pattern** for test data:
```typescript
function createMockEvent(overrides?: Partial<ChurchEvent>): ChurchEvent {
  return { id: '1', church: 'church-1', mass: 'mass-1', date: '2024-03-20', weekNumber: 12, active: 1, ...overrides };
}
```

## UI Layout Decisions

### Admin Dashboard (`routes/admin/+page.svelte`)

Always use a **fixed 3-column grid** regardless of how many cards are visible:

```svelte
<FeatureDefault class="mb-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
```

- Never switch to `md:grid-cols-2` when fewer cards are shown — cards left-align naturally in the empty column.
- Card order (left → right): **Jadwal Misa** → **Roster** → **Tata Tertib**
- **Roster** card is gated: only rendered when `isNewRosterFlow = true` (gate: `new_roster_flow`)
- `isNewRosterFlow` is loaded in `admin/+page.server.ts` via `checkServerGate(event.locals, 'new_roster_flow')`

## Common Gotchas

1. Schema change → `db:generate` → `db:migrate` (in that order, never skip generate)
2. Reactive state requires `$state()` — plain `let` is not reactive in Svelte 5
3. Never import from outer layers in `core/` — services depend on interfaces, not adapters directly
4. `VITE_` prefix exposes values to the browser — no secrets
5. Soft-delete with `active: 0`, never hard `DELETE`
6. Analytics: `snake_case` for all event names and metadata keys

## Project Context

Church service information system for the Catholic community.
- **Features**: event management, usher scheduling, RSVP/confirmation
- **Roles**: admin, usher, visitor
- **Analytics**: Statsig (feature flags + A/B testing) + PostHog (user behaviour)
- **Interfaces**: admin (`/admin/*`) + public (`/f/*`)
- **User-facing text**: Indonesian
