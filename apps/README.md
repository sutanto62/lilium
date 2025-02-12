# Lilium Inter Spinas (L.I.S)

A digital service information system built with SvelteKit, TypeScript, and SQLite.

## Prerequisites

- Node.js (LTS version)
- npm or pnpm
- SQLite3
- sqlpkg (for database extensions)

## Quick Start

1. Clone the repository

```bash
git clone <repository-url>
cd apps <repository-url>
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

Use `npx drizzle-kit drop` to remove the generated migrations if requqired. Do not remove the file manually.

2. Apply migrations
   Altering table might find challenges with drizzle-kit ORM migrations.

```bash
npm run db:migrate
```

3. View database in Studio:

```
npm run db:studio
```

## Project Structure

```
lilium/
├── apps/                   # Main SvelteKit application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── jadwal/    # Schedule-related components
│   │   │   └── Navigation.svelte
│   │   ├── core/
│   │   │   ├── entities/  # Core domain entities
│   │   │   └── service/   # Business logic services
│   │   ├── lib/
│   │   │   ├── server/    # Server-side code
│   │   │   │   └── db/    # Database configuration
│   │   │   └── utils/     # Utility functions
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
   - Built with SvelteKit and TypeScript
   - Uses Tailwind CSS for styling
   - Flowbite components for UI elements
   - Clean architecture with separation of concerns
2. Database:
   - SQLite with WAL mode for performance
   - Drizzle ORM for database operations
   - Migration management through drizzle-kit
3. Core Features:
   - Church event management
   - Usher scheduling system
   - Authentication via MS Entra and Gmail
   - Role-based access control
