-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Add foreign key constraint
CREATE TABLE `user_new` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL,
    `email` TEXT NOT NULL UNIQUE,
    `role` TEXT NOT NULL DEFAULT 'user',
    `cid` TEXT NOT NULL DEFAULT '1' REFERENCES church(id) ON DELETE CASCADE,
    `active` INTEGER NOT NULL DEFAULT 1,
    `created_at` INTEGER,
    `lingkungan_id` TEXT DEFAULT NULL,
    FOREIGN KEY (lingkungan_id) REFERENCES lingkungan (id) ON UPDATE no action ON DELETE CASCADE
);

-- Turn off foreign key support to avoid constraint errors
PRAGMA foreign_keys = OFF;

-- Copy data from old table with explicit column selection
INSERT INTO user_new (id, name, email, role, cid, lingkungan_id, active, created_at)
SELECT 
    id, 
    name, 
    email, 
    role, 
    cid,
    NULL as lingkungan_id,
    COALESCE(active, 1), 
    created_at
FROM user;

-- Drop old table
DROP TABLE user;

-- Rename new table
ALTER TABLE user_new RENAME TO user;

-- Recreate indexes
CREATE UNIQUE INDEX `user_id_unique` ON `user` (`id`);
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`); 