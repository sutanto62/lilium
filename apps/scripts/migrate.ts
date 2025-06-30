#!/usr/bin/env node

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const databaseUrl = process.env.VITE_DATABASE_URL || 'file:./db/lilium.db';
const authToken = process.env.VITE_DATABASE_AUTH_TOKEN;

async function runMigrations() {
    try {
        const client = createClient({
            url: databaseUrl,
            authToken: authToken
        });

        const db = drizzle(client);

        console.log('Running migrations...');
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('Migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations(); 