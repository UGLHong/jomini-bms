import 'dotenv/config'
import { Pool } from 'pg'
import { runBootstrap } from '../server/db/bootstrap'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  })

  try {
    const result = await runBootstrap(pool)
    console.log('[bootstrap] result', result)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[bootstrap] failed', err)
  process.exit(1)
})
