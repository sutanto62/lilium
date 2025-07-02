CREATE TABLE IF NOT EXISTS `church_zone_group` (
	`id` text PRIMARY KEY NOT NULL,
	`church_id` text,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`sequence` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`church_id`) REFERENCES `church`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
/*
 SQLite does not support "Set not null to column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
ALTER TABLE `church_zone` ADD `church_zone_group_id` text REFERENCES church_zone_group(id);--> statement-breakpoint
CREATE UNIQUE INDEX `church_zone_group_id_unique` ON `church_zone_group` (`id`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/