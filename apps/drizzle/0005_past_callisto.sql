/*
 SQLite does not support "Drop default from column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
/*
 SQLite does not support "Drop not null from column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
ALTER TABLE `church` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `church` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `church_position` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `church_position` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `church_zone` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `church_zone` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `event_usher` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_zone_pic` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_zone_pic` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `lingkungan` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lingkungan` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `mass` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `mass_zone` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `mass_zone` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `wilayah` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `wilayah` ADD `created_at` integer;