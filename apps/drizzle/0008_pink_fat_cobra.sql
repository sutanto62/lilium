/*
 SQLite does not support "Dropping foreign key" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
ALTER TABLE `event_zone_pic` DROP COLUMN `pic`;

BEGIN TRANSACTION;
CREATE TABLE temp_event_zone_pic (
	id text PRIMARY KEY NOT NULL,
	event_id text NOT NULL,
	zone_id text NOT NULL,
	active integer DEFAULT 1 NOT NULL,
	created_at integer,
	name text,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `church_zone`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO temp_event_zone_pic (id, event_id, zone_id, active, created_at, name)
SELECT id, event_id, zone_id, active, created_at, name FROM event_zone_pic;

DROP TABLE event_zone_pic;

ALTER TABLE temp_event_zone_pic RENAME TO event_zone_pic;
CREATE UNIQUE INDEX `event_zone_pic_id_unique` ON `event_zone_pic` (`id`);

COMMIT;
