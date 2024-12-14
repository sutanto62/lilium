import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const user = sqliteTable('user', {
	id: text('id').primaryKey().unique().notNull(),
	name: text('name').notNull(),
	email: text('email').unique().notNull(),
	role: text('role', { enum: ['admin', 'user'] })
		.notNull()
		.default('user')
});

export const church = sqliteTable('church', {
	id: text('id').primaryKey().unique().notNull(),
	code: text('code').unique().notNull(),
	name: text('name').notNull(),
	parish: text('parish')
});

export const church_zone = sqliteTable('church_zone', {
	id: text('id').primaryKey().unique().notNull(),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	sequence: integer('sequence'),
	pic: text('name')
});

export const church_position = sqliteTable('church_position', {
	id: text('id').primaryKey().unique().notNull(),
	zone: text('church_zone_id').references(() => church_zone.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	code: text('code'),
	description: text('description'),
	isPpg: integer('is_ppg').notNull().default(0),
	sequence: integer('sequence'),
	type: text('type', { enum: ['usher', 'prodiakon', 'peta'] }).notNull()
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
		.default('sunday')
});

export const mass_zone = sqliteTable('mass_zone', {
	id: text('id').primaryKey().unique().notNull(),
	mass: text('mass_id')
		.references(() => mass.id, { onDelete: 'cascade' })
		.notNull(),
	zone: text('zone_id')
		.references(() => church_zone.id, { onDelete: 'cascade' })
		.notNull(),
	is_active: integer('is_active').notNull().default(1),
	sequence: integer('sequence').default(0)
});

export const wilayah = sqliteTable('wilayah', {
	id: text('id').primaryKey().unique().notNull(),
	code: text('code'),
	name: text('name').notNull(),
	sequence: integer('sequence').notNull(),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' })
});

export const lingkungan = sqliteTable('lingkungan', {
	id: text('id').primaryKey().unique().notNull(),
	name: text('name').notNull(),
	sequence: integer('sequence'),
	wilayah: text('wilayah_id').references(() => wilayah.id, { onDelete: 'cascade' }),
	church: text('church_id').references(() => church.id, { onDelete: 'cascade' })
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
	created_at: integer('created_at')
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	isComplete: integer('is_complete').notNull().default(0),
	active: integer('active').notNull().default(1)
});

// TODO: add created_at field - auto assignment position
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
	createdAt: integer('created_at')
});
