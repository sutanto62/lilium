# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
```

### Database
```bash
npm run db:generate      # Generate migrations (after schema changes)
npm run db:migrate       # Apply migrations to database
npm run db:studio        # Open Drizzle Studio (database GUI)
npm run db:migrate:custom # Run custom migration script

# Initial setup (first time only)
make init                # Install dependencies and sqlpkg
make db-create           # Create database with WAL mode
```

IMPORTANT: When altering tables, use `npx drizzle-kit drop` to remove generated migrations if needed. Never delete migration files manually.

### Testing
```bash
npm run test             # Run all tests (integration + unit)
npm run test:unit        # Run unit tests with Vitest
npm run test:watch       # Run unit tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:integration # Run Playwright integration tests
```

### Code Quality
```bash
npm run check            # Type-check with svelte-check
npm run check:watch      # Type-check in watch mode
npm run lint             # Run ESLint and Prettier checks
npm run format           # Format code with Prettier
```

### Analytics
```bash
npm run scan:events      # Scan codebase for analytics events
```

## Architecture Overview

This is a **SvelteKit 5** application following **Clean Architecture** principles with a focus on separation of concerns and testability.

### Layer Structure

```
src/
├── core/                    # Domain layer (business logic)
│   ├── entities/           # Domain models (pure TypeScript)
│   ├── repositories/       # Repository interfaces (ports)
│   └── service/           # Business logic services
├── lib/
│   ├── application/       # Application services (Statsig, PostHog, Analytics)
│   ├── server/
│   │   ├── adapters/     # Repository implementations (adapters)
│   │   └── db/           # Database setup and operations (Drizzle ORM)
│   └── utils/            # Utility functions
└── routes/               # Presentation layer (SvelteKit routes)
    ├── admin/           # Admin pages (requires authentication + role)
    └── f/               # Public frontend pages
```

### Dependency Flow (Clean Architecture)

Dependencies point **inward**:
- `routes/` → `core/service/` → `core/repositories/` ← `lib/server/adapters/`
- Core layers never depend on outer layers
- Repository interfaces defined in `core/repositories/`
- Repository implementations in `lib/server/adapters/`

### Naming Conventions by Layer

**Domain Layer** (`core/entities/`):
- PascalCase, descriptive nouns
- Example: `ChurchEvent`, `EventUsher`, `Mass`

**Service Layer** (`core/service/`):
- Service interface: `Entity + Action + Service` → `EventService`
- Service methods: `action + Entity + detail` → `createEvent`, `retrieveEventById`
- Use verbs: `create`, `retrieve`, `update`, `delete`, `list`, `search`

**Repository Layer** (`core/repositories/`):
- Interface: `Entity + Repository` → `ScheduleRepository`
- Methods: `data_verb + Entity + Detail` → `findEventById`, `persistEvent`
- Use verbs: `persist`, `find`, `query`, `list`, `update`, `remove`

**Adapter Layer** (`lib/server/adapters/`):
- Class: `Technology + Entity + Adapter` → `SQLiteAdapter`
- Methods: Match repository interface methods
- Private helpers: Database operation names

### Key Technologies

- **Frontend**: Svelte 5 with runes (`$props`, `$state`, `$derived`, `$effect`)
- **Backend**: SvelteKit with server-side rendering
- **Database**: SQLite with Drizzle ORM (WAL mode for performance)
- **Auth**: @auth/sveltekit (OAuth: Google, Microsoft Entra ID)
- **Authorization**: CASL ability-based authorization
- **Analytics**: Dual tracking (Statsig + PostHog)
- **Styling**: Tailwind CSS + Flowbite components
- **Testing**: Vitest (unit) + Playwright (integration)

## Code Conventions

### Svelte 5 Patterns

Always use Svelte 5 runes syntax:

```svelte
<script lang="ts">
  // 1. Imports
  import { enhance } from '$app/forms';

  // 2. Props with $props()
  const { data, form } = $props<{
    data: PageProps['data'];
    form: PageProps['form'];
  }>();

  // 3. State with $state()
  let selectedDate = $state<Date | undefined>(undefined);
  let isSubmitting = $state(false);

  // 4. Derived values with $derived()
  const events = $derived(data.events);
  const hasEvents = $derived(events.length > 0);

  // 5. Functions
  function handleSubmit() {
    isSubmitting = true;
    // ...
  }

  // 6. Effects with $effect()
  $effect(() => {
    // Reactive side effects
  });
</script>
```

**Never use Svelte 4 patterns**: `export let`, `onMount` (use `$effect`), stores (use runes instead).

### Database Operations

Always use Drizzle ORM with type-safe queries:

```typescript
// Query
const result = await db
  .select()
  .from(event)
  .where(eq(event.id, eventId))
  .limit(1);

// Insert with returning
const result = await db
  .insert(event)
  .values({ ...data })
  .returning();

// Update with where clause
const result = await db
  .update(event)
  .set({ active: 0 })
  .where(eq(event.id, eventId))
  .returning();
```

**Never use raw SQL**. All database operations must use Drizzle's query builder.

### Error Handling

Transform database errors to domain errors:

```typescript
import { ServiceError } from '$core/errors/ServiceError';

try {
  const result = await repo.getEventById(id);
  if (!result) {
    throw ServiceError.notFound('Event not found', { id });
  }
  return result;
} catch (error) {
  if (error instanceof DatabaseError) {
    throw ServiceError.database('Failed to retrieve event', { id, originalError: error });
  }
  throw error;
}
```

### Analytics Event Tracking

Follow the dual-tracking strategy (Statsig + PostHog):

**Server-side** (`+page.server.ts`):
```typescript
const startTime = Date.now();
// ... data fetching ...

const metadata = {
  total_events: events.length,
  load_time_ms: Date.now() - startTime,
  has_events: events.length > 0
};

await Promise.all([
  statsigService.logEvent('admin_jadwal_view', 'load', session, metadata),
  posthogService.trackEvent('admin_jadwal_view', {
    event_type: 'page_load',
    ...metadata
  }, session)
]);
```

**Client-side** (`+page.svelte`):
```typescript
import { statsigService } from '$src/lib/application/StatsigService.js';
import { tracker } from '$src/lib/utils/analytics';

// Key events
statsigService.logEvent('admin_jadwal_filter', 'change', session, metadata);

// Business context
await tracker.track('admin_jadwal_filter_change', metadata, session, page);
```

**Event naming**: Use `{page}_{action}_{context}` pattern with snake_case.
**Metadata keys**: Always use snake_case.

Consult `doc/events-inventory.md` before adding new events. Run `npm run scan:events` to audit existing events.

### Security Requirements

**Authentication & Authorization**:
- Always validate session in protected routes
- Use `hasRole(session, 'admin')` for role checks
- Public routes (`/f/*`, `/lingkungan`) still validate inputs

**Environment Variables**:
- `VITE_*` variables are exposed to client (public config only)
- Never use `VITE_` prefix for secrets
- Server-only secrets use `process.env` (no prefix)

**Input Validation**:
- Always validate and sanitize form inputs
- Use parameterized queries (Drizzle ORM handles this)
- Never expose sensitive data in error messages

**Error Messages**:
- User-friendly messages in Indonesian
- Never expose stack traces in production
- Log errors with context but not sensitive data

## Adding New Features

1. **Define entity** in `core/entities/` (domain model)
2. **Create repository interface** in `core/repositories/` (port)
3. **Implement business logic** in `core/service/`
4. **Create database adapter** in `lib/server/adapters/` (implementation)
5. **Update database schema** in `lib/server/db/schema.ts`
6. **Generate migration**: `npm run db:generate`
7. **Create routes** in `routes/` (admin or frontend)
8. **Add analytics tracking** (server + client)
9. **Write tests** (unit tests in Vitest, integration in Playwright)

## Testing Strategy

- **Unit tests**: Business logic in `core/service/`
- **Integration tests**: User flows with Playwright
- **Test isolation**: Use `beforeEach` to reset state
- **Mocking**: Mock repositories and external dependencies
- **Coverage**: Focus on business logic and critical paths

## Common Gotchas

1. **Database migrations**: After schema changes, always run `npm run db:generate` before `npm run db:migrate`
2. **Svelte 5 runes**: State must use `$state()`, not plain `let` for reactivity
3. **Analytics events**: Use snake_case for event names and metadata keys
4. **Clean Architecture**: Never import from outer layers in core layers
5. **Repository pattern**: Services use interfaces, not implementations directly
6. **Environment variables**: `VITE_` prefix exposes to client, avoid for secrets
7. **Soft deletes**: Use `active` field (0/1) instead of deleting records

## Project Context

This is a church service information system serving the Catholic community. Features include:
- Church event management
- Usher scheduling system
- Role-based access control (admin, usher, visitor)
- Dual analytics (Statsig for feature flags/A/B testing, PostHog for user analytics)
- Public and admin interfaces
