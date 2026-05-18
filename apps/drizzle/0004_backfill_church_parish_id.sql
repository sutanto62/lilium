-- Backfill: link all existing church rows to the single seeded parish (D1)
UPDATE `church`
SET `parish_id` = 'parish-1'
WHERE `parish_id` IS NULL;
