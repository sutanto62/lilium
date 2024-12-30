/// <reference types="node" />
/// <reference types="vite/client" />
import { defineConfig } from 'drizzle-kit';

if (!process.env.VITE_DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	dbCredentials: {
		url: process.env.VITE_DATABASE_URL!,
	},
	verbose: true,
	strict: true
});
