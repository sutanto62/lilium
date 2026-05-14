import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ─── New domain: Parish (D1: single seeded row) ───────────────────────────────

export const parish = sqliteTable('parish', {
	id: text('id').primaryKey().unique().notNull(),
	name: text('name').notNull(),
	code: text('code').unique().notNull(),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const user = sqliteTable('user', {
	id: text('id').primaryKey().unique().notNull(),
	name: text('name').notNull(),
	email: text('email').unique().notNull(),
	role: text('role', { enum: ['admin', 'user'] })
		.notNull()
		.default('user'),
	cid: text('cid')
		.references(() => church.id, { onDelete: 'cascade' })
		.notNull()
		.default('1'),
	lingkunganId: text('lingkungan_id')
		.references(() => lingkungan.id, { onDelete: 'cascade' }),
	featurePreference: text('feature_preference'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const church = sqliteTable('church', {
	id: text('id').primaryKey().unique().notNull(),
	code: text('code').unique().notNull(),
	name: text('name').notNull(),
	parish: text('parish'),
	parishId: text('parish_id').references(() => parish.id),  // nullable FK to new parish table
	requirePpg: integer('require_ppg').notNull().default(0),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const church_zone_group = sqliteTable('church_zone_group', {
	id: text('id').primaryKey().unique().notNull(),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	sequence: integer('sequence'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const church_zone = sqliteTable('church_zone', {
	id: text('id').primaryKey().unique().notNull(),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' }),
	church_zone_group: text('church_zone_group_id').references(() => church_zone_group.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	sequence: integer('sequence'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const church_position = sqliteTable('church_position', {
	id: text('id').primaryKey().unique().notNull(),
	zone: text('church_zone_id').references(() => church_zone.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	isPpg: integer('is_ppg').notNull().default(0),
	sequence: integer('sequence'),
	type: text('type', { enum: ['usher', 'prodiakon', 'peta'] }).notNull(),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const mass = sqliteTable('mass', {
	id: text('id').primaryKey().unique(),
	code: text('code'),
	name: text('name').notNull(),
	sequence: integer('sequence'),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' }),
	day: text('day', {
		enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
	})
		.notNull()
		.default('sunday'),
	time: text('time'),
	briefingTime: text('briefing_time'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at')
});

// TODO: add church_id
export const mass_zone = sqliteTable('mass_zone', {
	id: text('id').primaryKey().unique().notNull(),
	mass: text('mass_id')
		.references(() => mass.id, { onDelete: 'cascade' })
		.notNull(),
	zone: text('zone_id')
		.references(() => church_zone.id, { onDelete: 'cascade' })
		.notNull(),
	sequence: integer('sequence').default(0),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const wilayah = sqliteTable('wilayah', {
	id: text('id').primaryKey().unique().notNull(),
	code: text('code'),
	name: text('name').notNull(),
	sequence: integer('sequence').notNull(),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' }),
	parishId: text('parish_id').references(() => parish.id),  // nullable FK to new parish table
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at')
});

export const lingkungan = sqliteTable('lingkungan', {
	id: text('id').primaryKey().unique().notNull(),
	name: text('name').notNull(),
	sequence: integer('sequence'),
	wilayah: text('wilayah_id').references(() => wilayah.id, { onDelete: 'cascade' }),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' }),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const event = sqliteTable('event', {
	id: text('id').primaryKey().unique().notNull(),
	church_id: text('church_id')
		.references(() => church.id, { onDelete: 'cascade' })
		.notNull(),
	mass_id: text('mass_id')
		.references(() => mass.id, { onDelete: 'cascade' })
		.notNull(),
	date: text('date').notNull(),
	week_number: integer('week_number'),
	created_at: integer('created_at').default(sql`(unixepoch())`),
	isComplete: integer('is_complete').notNull().default(0),
	active: integer('active').notNull().default(1),
	type: text('type', { enum: ['mass', 'feast'] }).notNull().default('mass'),
	code: text('code'),
	description: text('description')
});

export const event_zone_pic = sqliteTable('event_zone_pic', {
	id: text('id').primaryKey().unique().notNull(),
	event: text('event_id')
		.references(() => event.id, { onDelete: 'cascade' })
		.notNull(),
	zone_group: text('zone_group_id')
		.references(() => church_zone_group.id, { onDelete: 'cascade' })
		.notNull(),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`),
	name: text('name')
});

export const event_usher = sqliteTable('event_usher', {
	id: text('id').primaryKey().unique().notNull(),
	event: text('event_id')
		.references(() => event.id, { onDelete: 'cascade' })
		.notNull(),
	name: text('name').notNull(),
	wilayah: text('wilayah').notNull(),
	lingkungan: text('lingkungan').notNull(),
	position: text('position_id').references(() => church_position.id),
	isPpg: integer('is_ppg'),
	isKolekte: integer('is_kolekte'),
	sequence: integer('sequence'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

// ─── New domain: Community (territorial hierarchy, D3: starts empty) ──────────

export const community = sqliteTable('community', {
	id: text('id').primaryKey().unique().notNull(),
	name: text('name').notNull(),
	wilayahId: text('wilayah_id').references(() => wilayah.id, { onDelete: 'cascade' }),
	parishId: text('parish_id').references(() => parish.id),
	sequence: integer('sequence'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

// ─── New domain: Physical hierarchy (Section → Zone → Station) ────────────────

export const section = sqliteTable('section', {
	id: text('id').primaryKey().unique().notNull(),
	churchId: text('church_id')
		.references(() => church.id, { onDelete: 'cascade' })
		.notNull(),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	sequence: integer('sequence'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const zone = sqliteTable('zone', {
	id: text('id').primaryKey().unique().notNull(),
	churchId: text('church_id')
		.references(() => church.id, { onDelete: 'cascade' })
		.notNull(),
	sectionId: text('section_id').references(() => section.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	sequence: integer('sequence'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

// ─── New domain: Ministry catalog (Type Object pattern) ───────────────────────

export const ministry = sqliteTable('ministry', {
	id: text('id').primaryKey().unique().notNull(),
	name: text('name').notNull(),
	code: text('code').unique().notNull(),
	description: text('description'),
	requiresStation: integer('requires_station').notNull().default(1), // 1=true, 0=false (PETA=0)
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const ministry_role = sqliteTable('ministry_role', {
	id: text('id').primaryKey().unique().notNull(),
	ministryId: text('ministry_id')
		.references(() => ministry.id, { onDelete: 'cascade' })
		.notNull(),
	name: text('name').notNull(),
	code: text('code').notNull(),
	isSpecialCollection: integer('is_special_collection').notNull().default(0), // 1=true (Kolekte/PPG/PPKG)
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

export const station = sqliteTable('station', {
	id: text('id').primaryKey().unique().notNull(),
	churchId: text('church_id')
		.references(() => church.id, { onDelete: 'cascade' })
		.notNull(),
	zoneId: text('zone_id')
		.references(() => zone.id, { onDelete: 'cascade' })
		.notNull(),
	ministryId: text('ministry_id')
		.references(() => ministry.id, { onDelete: 'cascade' })
		.notNull(),
	defaultRoleId: text('default_role_id').references(() => ministry_role.id),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	sequence: integer('sequence'),
	active: integer('active').notNull().default(1),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});

// ─── New domain: Roster aggregate ─────────────────────────────────────────────

export const roster = sqliteTable('roster', {
	id: text('id').primaryKey().unique().notNull(),
	eventId: text('event_id')
		.references(() => event.id, { onDelete: 'cascade' })
		.notNull(),
	createdByUserId: text('created_by_user_id')
		.references(() => user.id)
		.notNull(),
	version: integer('version').notNull().default(1),
	status: text('status', { enum: ['draft', 'submitted', 'confirmed'] })
		.notNull()
		.default('draft'),
	createdAt: integer('created_at').default(sql`(unixepoch())`),
	updatedAt: integer('updated_at').default(sql`(unixepoch())`)
});

export const roster_entry = sqliteTable('roster_entry', {
	id: text('id').primaryKey().unique().notNull(),
	rosterId: text('roster_id')
		.references(() => roster.id, { onDelete: 'cascade' })
		.notNull(),
	communityId: text('community_id')
		.references(() => community.id, { onDelete: 'cascade' })
		.notNull(),
	communityName: text('community_name').notNull(), // snapshot at assignment time
	wilayahId: text('wilayah_id')
		.references(() => wilayah.id)
		.notNull(),
	wilayahName: text('wilayah_name').notNull(), // snapshot at assignment time
	status: text('status', { enum: ['draft', 'submitted', 'confirmed'] })
		.notNull()
		.default('draft'),
	submittedAt: integer('submitted_at'),
	confirmedAt: integer('confirmed_at')
});

export const roster_usher = sqliteTable('roster_usher', {
	id: text('id').primaryKey().unique().notNull(),
	rosterEntryId: text('roster_entry_id')
		.references(() => roster_entry.id, { onDelete: 'cascade' })
		.notNull(),
	name: text('name').notNull(), // plain string; future: parishioner FK
	ministryRoleId: text('ministry_role_id')
		.references(() => ministry_role.id)
		.notNull(),
	stationId: text('station_id').references(() => station.id),
	sequence: integer('sequence'),
	createdAt: integer('created_at').default(sql`(unixepoch())`)
});
