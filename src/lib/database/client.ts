/**
 * Database client factory.
 * Demo mode → SQLite file via @libsql/client (pure JS, không cần Python)
 * Production → PostgreSQL via Supabase / @vercel/postgres
 */

import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { createClient, Client } from '@libsql/client'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const IS_DEMO = process.env.DEMO_MODE !== 'false'

type DemoDb = ReturnType<typeof drizzleLibsql>

let _demoDb: DemoDb | null = null
let _rawClient: Client | null = null

export function getRawClient(): Client {
  if (_rawClient) return _rawClient

  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = path.join(dataDir, 'xuong-data-capture.db')
  _rawClient = createClient({ url: `file:${dbPath}` })
  // Prevent SQLite_BUSY lock errors during async queries
  _rawClient.execute('PRAGMA busy_timeout = 5000;')
  _rawClient.execute('PRAGMA journal_mode = WAL;')
  return _rawClient
}

/**
 * Trả về database client (Drizzle ORM).
 */
export function getDb(): DemoDb {
  if (!IS_DEMO) {
    throw new Error(
      'PostgreSQL client chưa được cấu hình cho production. ' +
      'Dùng DEMO_MODE=true để phát triển local, ' +
      'hoặc cấu hình Supabase/DATABASE_URL cho production.'
    )
  }

  if (_demoDb) return _demoDb

  const client = getRawClient()
  _demoDb = drizzleLibsql(client, { schema })

  return _demoDb
}

export type AppDatabase = ReturnType<typeof getDb>
