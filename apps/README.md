# Lilium Inter Spinas (L.I.S)

A digital service information system built with SvelteKit, TypeScript, and SQLite. Contribution to Catholic community.

## Prerequisites

- Node.js (LTS version)
- npm or pnpm
- SQLite3
- sqlpkg (for database extensions)
- Statsig SDK key (VITE_STATSIG_CLIENT_KEY)
- PostHog project API key (VITE_POSTHOG_KEY)

## Quick Start

1. Clone the repository

```bash
git clone <repository-url>
cd apps
```

2. Initialize the project

```bash
make init
```

This will:

- Install Node.js dependencies
- Install sqlpkg and required extensions
- Set up the development environment

```bash
make db-create
```

## Development

1. Start the development server:

```bash
npm run dev
```

## Database Management

1. Generate database migrations

```bash
npm run db:generate
```

Use `npx drizzle-kit drop` to remove the generated migrations if required. Do not remove the file manually.

2. Apply migrations
   Altering table might find challenges with drizzle-kit ORM migrations.

```bash
npm run db:migrate
```

3. View database in Studio:

```
npm run db:studio
```

## System Architecture

### Clean Architecture

The project follows Clean Architecture principles to maintain separation of concerns and maintainability:

```
src/
├── core/                  # Core business logic
│   ├── entities/         # Domain models and business objects
│   ├── repositories/     # Repository interfaces
│   └── service/         # Business logic services
├── lib/
│   └── server/
│       └── db/          # Database implementations
└── routes/              # API endpoints and UI components
```

#### Layers

1. **Entities Layer** (`core/entities/`)
   - Pure domain models and business objects
   - No dependencies on other layers
   - Defines core business rules

2. **Repository Interfaces** (`core/repositories/`)
   - Defines contracts for data access
   - Pure interfaces that entities depend on
   - Enables loose coupling between layers
   - Translate repository layer error into domain-meaningful message

3. **Services Layer** (`core/service/`)
   - Contains business logic
   - Uses repositories through interfaces
   - Implements use cases and workflows
   - Handle domain rules, validation, and coordinate between repositories

4. **Database Implementation** (`lib/server/db/`)
   - Implements repository interfaces
   - Contains database-specific code
   - Uses Drizzle ORM for database operations

5. **Adapters Layer** (`routes/`)
   - Connects core logic to the outside world
   - Handles HTTP requests/responses
   - Implements UI components

#### Key Principles

- Dependencies point inward (core layers don't depend on outer layers)
- Use dependency injection for implementations
- Keep business logic in the service layer
- Use interfaces for repositories to maintain loose coupling
- Keep database-specific code in the implementation layer

#### Adding New Features

1. Define entity in `core/entities/`
2. Create repository interface in `core/repositories/`
3. Implement business logic in `core/service/`
4. Create database implementation in `lib/server/db`
5. Create API endpoints or UI components in `routes/`

## Project Structure

```
lilium/
├── apps/                   # Main SvelteKit application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── jadwal/    # Schedule-related components
│   │   │   └── Navigation.svelte
│   │   ├── core/
│   │   │   ├── entities/      # Core domain entities
│   │   │   ├── repositories/  # Repository interfaces
│   │   │   └── service/       # Business logic services
│   │   ├── lib/
│   │   │   ├── application/ # Application services
│   │   │   │   ├── StatsigService.ts    # Statsig integration
│   │   │   │   ├── PostHogService.ts    # PostHog integration
│   │   │   │   ├── AnalyticsTracker.ts  # Analytics tracker interface
│   │   │   │   ├── EventManager.ts      # Event processing
│   │   │   │   └── EventQueue.ts        # Event queuing system
│   │   │   ├── server/    # Server-side code
│   │   │   │   ├── adapters/  # Repository implementations
│   │   │   │   └── db/    # Database configuration
│   │   │   └── utils/     # Utility functions
│   │   │       └── analytics.ts  # Analytics tracker utility
│   │   ├── routes/        # SvelteKit routes
│   │   │   ├── admin/     # Admin pages
│   │   │   └── f/         # Frontend pages
│   │   ├── app.css        # Global styles
│   │   └── app.html       # HTML template
│   ├── static/            # Static assets
│   ├── tests/             # Test files
│   ├── drizzle/           # Database migrations
│   └── db/                # SQLite database files
├── api/                   # Go API server (separate service)
└── docs/                  # Documentation
```

Key points:

1. Frontend Architecture:
   - Built with SvelteKit 5 and TypeScript
   - Uses Svelte 5 runes ($props, $state, $derived, $effect)
   - Uses Tailwind CSS for styling
   - Flowbite components for UI elements
   - Clean architecture with separation of concerns
2. Database:
   - SQLite with WAL mode for performance
   - Drizzle ORM for database operations
   - Migration management through drizzle-kit
   - Repository pattern with interface-based design
3. Core Features:
   - Church event management
   - Usher scheduling system
   - Authentication via MS Entra and Gmail
   - Role-based access control
   - Dual analytics tracking (Statsig + PostHog)
     - **Statsig**: Feature flag management, A/B testing, key event tracking
     - **PostHog**: Comprehensive user analytics, session replay, business metrics
     - Structured event tracking with rich metadata
     - User journey analysis and conversion funnels
     - Performance metrics and error tracking
     - Server-side and client-side event tracking
