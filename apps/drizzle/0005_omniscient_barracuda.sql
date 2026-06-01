-- 0003 has when=1747386600000, which is older than migration 0000's journal timestamp
-- (1769133298583). Drizzle will skip 0003, so this migration adds confirmed_by_user_id.
-- SQLite does not support "Creating foreign key on existing column" out of the box;
-- the REFERENCES clause is stored in schema metadata only (not enforced on ALTER).
ALTER TABLE `roster_entry` ADD `confirmed_by_user_id` text REFERENCES user(id);