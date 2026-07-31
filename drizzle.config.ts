import { defineConfig } from 'drizzle-kit'
import path from 'path'

const isDemoMode = process.env.DEMO_MODE === 'true'
const dataDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'xuong-data-capture.db')

export default defineConfig({
  schema: './src/lib/database/schema.ts',
  out: './supabase/migrations',

  // Demo mode: SQLite via libsql
  // Production: PostgreSQL via Supabase
  dialect: isDemoMode ? 'turso' : 'postgresql',

  dbCredentials: isDemoMode
    ? { url: `file:${dbPath}` }
    : {
        url: process.env.DATABASE_URL ?? '',
      },

  verbose: true,
  strict: true,
})
