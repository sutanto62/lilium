CREATE TABLE `event_zone_pic` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`pic` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `church_zone`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pic`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_zone_pic_id_unique` ON `event_zone_pic` (`id`);