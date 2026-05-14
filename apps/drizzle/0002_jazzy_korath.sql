CREATE TABLE `community` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`wilayah_id` text,
	`parish_id` text,
	`sequence` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`wilayah_id`) REFERENCES `wilayah`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parish_id`) REFERENCES `parish`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ministry` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`requires_station` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `ministry_role` (
	`id` text PRIMARY KEY NOT NULL,
	`ministry_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`is_special_collection` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`ministry_id`) REFERENCES `ministry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `parish` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `roster` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roster_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`roster_id` text NOT NULL,
	`community_id` text NOT NULL,
	`community_name` text NOT NULL,
	`wilayah_id` text NOT NULL,
	`wilayah_name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` integer,
	`confirmed_at` integer,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`community_id`) REFERENCES `community`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wilayah_id`) REFERENCES `wilayah`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roster_usher` (
	`id` text PRIMARY KEY NOT NULL,
	`roster_entry_id` text NOT NULL,
	`name` text NOT NULL,
	`ministry_role_id` text NOT NULL,
	`station_id` text,
	`sequence` integer,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`roster_entry_id`) REFERENCES `roster_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ministry_role_id`) REFERENCES `ministry_role`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `station`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `section` (
	`id` text PRIMARY KEY NOT NULL,
	`church_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`sequence` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `station` (
	`id` text PRIMARY KEY NOT NULL,
	`church_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`ministry_id` text NOT NULL,
	`default_role_id` text,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`sequence` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `zone`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ministry_id`) REFERENCES `ministry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`default_role_id`) REFERENCES `ministry_role`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `zone` (
	`id` text PRIMARY KEY NOT NULL,
	`church_id` text NOT NULL,
	`section_id` text,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`sequence` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `church` ADD `parish_id` text REFERENCES parish(id);--> statement-breakpoint
ALTER TABLE `wilayah` ADD `parish_id` text REFERENCES parish(id);--> statement-breakpoint
CREATE UNIQUE INDEX `community_id_unique` ON `community` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ministry_id_unique` ON `ministry` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ministry_code_unique` ON `ministry` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `ministry_role_id_unique` ON `ministry_role` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `parish_id_unique` ON `parish` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `parish_code_unique` ON `parish` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `roster_id_unique` ON `roster` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `roster_entry_id_unique` ON `roster_entry` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `roster_usher_id_unique` ON `roster_usher` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `section_id_unique` ON `section` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `station_id_unique` ON `station` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `zone_id_unique` ON `zone` (`id`);--> statement-breakpoint
-- Seed: single parish row (D1 — one parish, always)
INSERT INTO `parish` (`id`, `name`, `code`, `active`) VALUES
  ('parish-1', 'Paroki Default', 'DEFAULT', 1);
--> statement-breakpoint
-- Seed: ministry catalog rows (Type Object — add new ministries as rows, not code)
INSERT INTO `ministry` (`id`, `name`, `code`, `description`, `requires_station`, `active`) VALUES
  ('min-usher',    'Penerima Tamu', 'USHER',        'Petugas penerima tamu',                          1, 1),
  ('min-prodiakon','Prodiakon',     'PRODIAKON',     'Prodiakon',                                      1, 1),
  ('min-peta',     'PETA',          'PETA',          'Petugas Tata Tertib Altar (roster author)',       0, 1),
  ('min-emhc',     'EMHC',          'EMHC',          'Extraordinary Minister of Holy Communion',       1, 1),
  ('min-altar',    'Altar Server',  'ALTAR_SERVER',  'Putra-Putri Altar',                              1, 1);
--> statement-breakpoint
-- Seed: ministry roles for USHER (replaces boolean isPpg / isKolekte flags)
INSERT INTO `ministry_role` (`id`, `ministry_id`, `name`, `code`, `is_special_collection`, `active`) VALUES
  ('role-regular',     'min-usher', 'Regular',  'REGULAR',      0, 1),
  ('role-kolekte',     'min-usher', 'Kolekte',  'KOLEKTE',      1, 1),
  ('role-ppg',         'min-usher', 'PPG',      'PPG',          1, 1),
  ('role-ppkg',        'min-usher', 'PPKG',     'PPKG',         1, 1),
  ('role-processional','min-usher', 'Prosesi',  'PROCESSIONAL', 0, 1);