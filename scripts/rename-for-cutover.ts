import 'dotenv/config'
import { Pool } from 'pg'

const COLLIDING_TABLES = [
  'game',
  'supplier',
  'supplier_game',
  'product',
  'stock',
  'order',
  'external_link',
  'config',
  'user',
]

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const res = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass('public.' || $1) IS NOT NULL AS exists`,
    [name],
  )
  return Boolean(res.rows[0]?.exists)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  const dryRun = process.argv.includes('--dry-run')

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  })

  const renames: Array<{ from: string; to: string }> = []
  for (const name of COLLIDING_TABLES) {
    const hasLegacy = await tableExists(pool, name)
    const hasRenamed = await tableExists(pool, `${name}_legacy`)
    if (!hasLegacy) continue
    if (hasRenamed) {
      console.log(`[rename] skip ${name}: ${name}_legacy already exists`)
      continue
    }
    renames.push({ from: name, to: `${name}_legacy` })
  }

  if (!renames.length) {
    console.log('[rename] no colliding tables found. Safe to run db:migrate.')
    await pool.end()
    return
  }

  console.log(`[rename] ${dryRun ? '(dry-run) would rename' : 'renaming'}:`)
  for (const { from, to } of renames) console.log(`  ${from} -> ${to}`)

  if (dryRun) {
    await pool.end()
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const { from, to } of renames) {
      await client.query(`ALTER TABLE "${from}" RENAME TO "${to}"`)
    }
    await client.query('COMMIT')
    console.log('[rename] done. You can now run: npm run db:migrate && npm run db:migrate-legacy')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[rename] failed', err)
  process.exit(1)
})
