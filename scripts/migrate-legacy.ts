import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { argv } from 'node:process'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '@/server/db/schema'

export type MigrateLegacyOpts = {
  dryRun: boolean
  batchSize: number
  onlyTables?: string[]
}

type Logger = (msg: string, extra?: unknown) => void

function parseArgs(): MigrateLegacyOpts {
  const opts: MigrateLegacyOpts = { dryRun: false, batchSize: 500 }
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg.startsWith('--batch-size=')) opts.batchSize = Number(arg.split('=')[1])
    else if (arg.startsWith('--only=')) opts.onlyTables = (arg.split('=')[1] ?? '').split(',').filter(Boolean)
  }
  return opts
}

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const res = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${name}`],
  )
  return Boolean(res.rows[0]?.exists)
}

async function getColumns(pool: Pool, table: string): Promise<Set<string>> {
  const res = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  )
  return new Set(res.rows.map((r) => r.column_name))
}

async function migrateOrders(
  pool: Pool,
  _db: ReturnType<typeof drizzle<typeof schema>>,
  opts: MigrateLegacyOpts,
  log: Logger,
) {
  const legacyTables = ['order_v2', 'order_legacy', 'order']
  const existing: string[] = []
  for (const table of legacyTables) {
    if (await tableExists(pool, table)) existing.push(table)
  }
  if (!existing.length) {
    log('[orders] no legacy order table found, skipping')
    return
  }

  const newOrderColumns = await getColumns(pool, 'order')
  const source = existing.find((table) => table !== 'order')
  if (!source) {
    log('[orders] only current `order` table found, assuming already migrated')
    return
  }

  const cols = await getColumns(pool, source)
  const commonColumns = [...cols].filter((column) => newOrderColumns.has(column))
  log(`[orders] migrating from ${source}; matched columns: ${commonColumns.length}`)

  if (opts.dryRun) {
    const count = await pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM ${source}`)
    log(`[orders][dry-run] would copy ${count.rows[0]?.c ?? 0} rows using INSERT ... ON CONFLICT (id) DO NOTHING`)
    return
  }

  const columnList = commonColumns.map((column) => `"${column}"`).join(', ')
  const insertSql = `
    INSERT INTO "order" (${columnList})
    SELECT ${columnList} FROM "${source}"
    ON CONFLICT (id) DO NOTHING
  `
  const res = await pool.query(insertSql)
  log(`[orders] inserted ${res.rowCount} rows from ${source}`)
}

async function migrateStock(pool: Pool, opts: MigrateLegacyOpts, log: Logger) {
  if (!(await tableExists(pool, 'stock'))) {
    log('[stock] table missing, skipping')
    return
  }
  const cols = await getColumns(pool, 'stock')
  if (!cols.has('game_key') && cols.has('game')) {
    log('[stock] legacy column `game` detected; aliasing into game_key')
    if (!opts.dryRun) {
      await pool.query(`ALTER TABLE stock RENAME COLUMN game TO game_key`)
    }
  }
}

async function migrateProducts(pool: Pool, opts: MigrateLegacyOpts, log: Logger) {
  if (!(await tableExists(pool, 'product'))) {
    log('[product] table missing, skipping')
    return
  }
  const cols = await getColumns(pool, 'product')

  if (cols.has('game') && !cols.has('game_key')) {
    log('[product] renaming game -> game_key')
    if (!opts.dryRun) await pool.query(`ALTER TABLE product RENAME COLUMN game TO game_key`)
  }
  if (cols.has('supplier') && !cols.has('supplier_key')) {
    log('[product] renaming supplier -> supplier_key')
    if (!opts.dryRun) await pool.query(`ALTER TABLE product RENAME COLUMN supplier TO supplier_key`)
  }
}

async function migrateExternalLinks(pool: Pool, opts: MigrateLegacyOpts, log: Logger) {
  if (!(await tableExists(pool, 'external_link'))) {
    log('[external_link] table missing, skipping')
    return
  }
  const cols = await getColumns(pool, 'external_link')
  if (!cols.has('metadata')) {
    log('[external_link] adding metadata column')
    if (!opts.dryRun) {
      await pool.query(`ALTER TABLE external_link ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`)
    }
  }
}

async function verify(pool: Pool, log: Logger) {
  const tables = ['game', 'supplier', 'supplier_game', 'product', 'stock', 'order', 'external_link', 'config', 'user']
  for (const table of tables) {
    const exists = await tableExists(pool, table)
    log(`[verify] ${table}: ${exists ? 'OK' : 'MISSING'}`)
  }
}

const LEGACY_SIGNALS = [
  'order_v2',
  'order_legacy',
  'product_legacy',
  'stock_legacy',
  'external_link_legacy',
  'config_legacy',
  'supplier_legacy',
  'supplier_game_legacy',
  'user_legacy',
  'game_legacy',
]

export async function hasLegacyArtifacts(pool: Pool): Promise<boolean> {
  for (const table of LEGACY_SIGNALS) {
    if (await tableExists(pool, table)) return true
  }

  if (await tableExists(pool, 'product')) {
    const cols = await getColumns(pool, 'product')
    if (cols.has('game') && !cols.has('game_key')) return true
    if (cols.has('supplier') && !cols.has('supplier_key')) return true
  }
  if (await tableExists(pool, 'stock')) {
    const cols = await getColumns(pool, 'stock')
    if (cols.has('game') && !cols.has('game_key')) return true
  }
  if (await tableExists(pool, 'external_link')) {
    const cols = await getColumns(pool, 'external_link')
    if (!cols.has('metadata')) return true
  }
  return false
}

export async function runMigrateLegacy(
  pool: Pool,
  opts: MigrateLegacyOpts = { dryRun: false, batchSize: 500 },
  log: Logger = (msg) => console.log(msg),
): Promise<void> {
  log(`[migrate-legacy] starting${opts.dryRun ? ' (dry-run)' : ''}`)
  const db = drizzle(pool, { schema })

  const tasks: Array<[string, () => Promise<void>]> = [
    ['products', () => migrateProducts(pool, opts, log)],
    ['stock', () => migrateStock(pool, opts, log)],
    ['external_link', () => migrateExternalLinks(pool, opts, log)],
    ['orders', () => migrateOrders(pool, db, opts, log)],
    ['verify', () => verify(pool, log)],
  ]

  for (const [name, task] of tasks) {
    if (opts.onlyTables && !opts.onlyTables.includes(name)) continue
    await task()
  }

  log('[migrate-legacy] done')
}

async function main() {
  const opts = parseArgs()
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  })
  try {
    await runMigrateLegacy(pool, opts)
  } finally {
    await pool.end()
  }
}

const selfUrl = typeof import.meta.url === 'string' ? import.meta.url : ''
const invokedDirectly = selfUrl !== '' && process.argv[1] === fileURLToPath(selfUrl)
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[migrate-legacy] failed', err)
    process.exit(1)
  })
}

void sql
