import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const NEW_TABLES = [
  'game',
  'supplier',
  'supplier_game',
  'product',
  'stock',
  'order',
  'external_link',
  'config',
  'user',
  'refresh_token',
  'pending_notification',
  'supplier_submission',
]

async function assertSafeToMigrate(pool: Pool): Promise<void> {
  const driz = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass('public.__drizzle_migrations') IS NOT NULL AS exists`,
  )
  if (driz.rows[0]?.exists) return

  const collisions: string[] = []
  for (const name of NEW_TABLES) {
    const res = await pool.query<{ exists: boolean }>(
      `SELECT to_regclass('public.' || $1) IS NOT NULL AS exists`,
      [name],
    )
    if (res.rows[0]?.exists) collisions.push(name)
  }

  if (collisions.length > 0) {
    console.error(
      [
        '[migrate] refusing to run: Drizzle has never run on this database but the following',
        `[migrate] tables already exist and would collide with 0000_init.sql: ${collisions.join(', ')}`,
        '[migrate] Pick one of:',
        '[migrate]   a) Point DATABASE_URL at a fresh database, then run scripts/migrate-legacy.ts',
        '[migrate]      with LEGACY_DATABASE_URL=<old-db-url> to copy data across.',
        '[migrate]   b) Run `npm run db:rename-for-cutover` on the existing database to rename',
        '[migrate]      the colliding tables to <name>_legacy, then re-run this job.',
      ].join('\n'),
    )
    process.exit(2)
  }
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  })

  await assertSafeToMigrate(pool)

  const db = drizzle(pool)
  console.log('[migrate] applying migrations...')
  await migrate(db, { migrationsFolder: './server/db/migrations' })
  console.log('[migrate] done.')
  await pool.end()
}

main().catch((err) => {
  console.error('[migrate] failed', err)
  process.exit(1)
})
