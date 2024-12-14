# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/main/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

### Structures

1. Components, all reusable components should be placed inside `/src/components` folders and import from any file using `$components`.

### Database

Initiate sqlite db with WAL (performance consideration)

````sqlite3 my_database.db <<EOF
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA temp_store=MEMORY;
PRAGMA mmap_size=30000000000;
.quit
EOF```

Import CSV using sqlite3 CLI
```
$ sqlite3 database.db
sqlite> .import --csv --skip 1 file.csv tablename
```
--skip 1 will ignore CSV first line/header


1. Create table and models in `src/lib/server/db/schema.ts` and `src/lib/models/schedule.ts`
2. Run script `npm run db:generate` to create sql scripts.
3. Run script `npm run db:push` to run the sql scripts (no migration files, during dev).
4. Run script `npm run db:migrate` to migrate the database (with migration files).
````

### Maintenance

`npx npm-check` to check update for npm module

### Database Connectivity

The system provides support to use any database engine provided. LIS uses ports
and adapters architecture in order to extend the database supports.

1. M

### Drizzle Drop Migration

`npx drizzle-kit drop`

### Design

1. Svelte page and script serves human interface layer.
2. Human interface layer interacts with data through service.
3. Service responsible to get and format returned data from repository. Add `Response` suffix for returned entities.
