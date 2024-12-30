CREATE TABLE `church` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`parish` text
);
--> statement-breakpoint
CREATE TABLE `church_position` (
	`id` text PRIMARY KEY NOT NULL,
	`church_zone_id` text,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`is_ppg` integer DEFAULT 0 NOT NULL,
	`sequence` integer,
	`type` text NOT NULL,
	FOREIGN KEY (`church_zone_id`) REFERENCES `church_zone`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `church_zone` (
	`id` text PRIMARY KEY NOT NULL,
	`church_id` text,
	`name` text,
	`code` text,
	`description` text,
	`sequence` integer,
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`church_id` text NOT NULL,
	`mass_id` text NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_complete` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mass_id`) REFERENCES `mass`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `event_usher` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`wilayah` text NOT NULL,
	`lingkungan` text NOT NULL,
	`position_id` text,
	`is_ppg` integer,
	`is_kolekte` integer,
	`sequence` integer,
	`created_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `church_position`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lingkungan` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sequence` integer,
	`wilayah_id` text,
	`church_id` text,
	FOREIGN KEY (`wilayah_id`) REFERENCES `wilayah`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mass` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`sequence` integer,
	`church_id` text,
	`day` text DEFAULT 'sunday' NOT NULL,
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mass_zone` (
	`id` text PRIMARY KEY NOT NULL,
	`mass_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sequence` integer DEFAULT 0,
	FOREIGN KEY (`mass_id`) REFERENCES `mass`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `church_zone`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wilayah` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`sequence` integer NOT NULL,
	`church_id` text,
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `church_id_unique` ON `church` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `church_code_unique` ON `church` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `church_position_id_unique` ON `church_position` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `church_zone_id_unique` ON `church_zone` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_id_unique` ON `event` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_usher_id_unique` ON `event_usher` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lingkungan_id_unique` ON `lingkungan` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mass_id_unique` ON `mass` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `mass_zone_id_unique` ON `mass_zone` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_id_unique` ON `user` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `wilayah_id_unique` ON `wilayah` (`id`);