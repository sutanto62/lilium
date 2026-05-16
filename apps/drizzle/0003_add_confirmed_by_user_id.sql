-- Add confirmed_by_user_id audit column to roster_entry
-- Records which PETA member confirmed the community's usher assignment.
ALTER TABLE `roster_entry` ADD `confirmed_by_user_id` text REFERENCES `user`(`id`);
