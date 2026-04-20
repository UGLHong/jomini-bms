import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let pool: Pool | null = null
let dbInstance: NodePgDatabase<typeof schema> | null = null

export function getPool(): Pool {
  if (pool) return pool

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }

  pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  })

  pool.on('error', (err) => {
    console.error('[pg] pool error', err)
  })

  return pool
}

export function useDb(): NodePgDatabase<typeof schema> {
  if (dbInstance) return dbInstance
  dbInstance = drizzle(getPool(), { schema, logger: process.env.DB_LOGGER === '1' })
  return dbInstance
}

export { schema }
