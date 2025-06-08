-- Add foreign key constraint
CREATE TABLE user_new (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    cid TEXT NOT NULL DEFAULT '1' REFERENCES church(id) ON DELETE CASCADE,
    lingkungan_id TEXT REFERENCES lingkungan(id) ON DELETE CASCADE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER
);

-- Copy data from old table
INSERT INTO user_new SELECT * FROM user;

-- Drop old table
DROP TABLE user;

-- Rename new table
ALTER TABLE user_new RENAME TO user;

-- Recreate indexes
CREATE UNIQUE INDEX user_id_unique ON user(id);
CREATE UNIQUE INDEX user_email_unique ON user(email); 