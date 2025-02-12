/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/
-- migrate user table

-- First create a temporary table with the new structure
CREATE TABLE `user_new` (
    `id` text PRIMARY KEY NOT NULL,
    `name` text NOT NULL,
    `email` text NOT NULL,
    `role` text NOT NULL DEFAULT 'user',
    `cid` text NOT NULL DEFAULT '8f7e6d5c-4b3a-4948-a7f6-1c2d3e4f5a6b1',
    FOREIGN KEY (`cid`) REFERENCES `church`(`id`) ON DELETE cascade,
    UNIQUE (`id`),
    UNIQUE (`email`)
);

-- Copy data from the old table to the new table
INSERT INTO `user_new` (`id`, `name`, `email`, `role`)
SELECT `id`, `name`, `email`, `role` FROM `user`;

-- Drop the old table
DROP TABLE `user`;

-- Rename the new table to the original name
ALTER TABLE `user_new` RENAME TO `user`;
