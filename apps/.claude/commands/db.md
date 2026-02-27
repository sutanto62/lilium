Review the provided database code for compliance with our Drizzle ORM and SQLite patterns.

## Checklist

**Schema Definition**
- [ ] Uses `sqliteTable` from `drizzle-orm/sqlite-core`
- [ ] All columns use `snake_case` names
- [ ] Primary keys are `.primaryKey().unique().notNull()`
- [ ] Timestamps use `integer` with `sql\`(unixepoch())\`` default
- [ ] Soft-delete uses `active: integer('active').notNull().default(1)`

**Queries**
- [ ] No raw SQL strings — all queries use Drizzle's query builder
- [ ] Uses `eq`, `and`, `inArray` from `drizzle-orm` for conditions
- [ ] Results are limited with `.limit()` where appropriate
- [ ] Type inference uses `typeof table.$inferSelect` / `.$inferInsert`

**Insert / Update / Delete**
- [ ] Inserts use `.returning()` to get the created record
- [ ] Updates include a `.where()` clause
- [ ] Deletes are soft (`set({ active: 0 })`) not hard

**Transactions**
- [ ] Multiple related operations are wrapped in `db.transaction()`

**Repository Pattern**
- [ ] Interface defined in `core/repositories/` using verbs: `persist`, `find`, `query`, `list`, `remove`
- [ ] Adapter in `lib/server/adapters/` implements the interface

**Migrations**
- [ ] Schema changes are followed by `npm run db:generate` then `npm run db:migrate`
- [ ] Migration files are never edited manually

Flag any violations and suggest corrected code.
