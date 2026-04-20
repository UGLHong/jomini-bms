import type { Pool } from 'pg'
import { hasLegacyArtifacts, runMigrateLegacy } from '@/scripts/migrate-legacy'
import { runSeed } from '@/scripts/seed'

const TABLE = 'bootstrap_state'

const SEED_STEP = 'seed:v1'
const LEGACY_STEP = 'legacy:v1'

export type BootstrapLogger = (msg: string, extra?: unknown) => void

export type BootstrapResult = {
  ranSeed: boolean
  ranLegacyMigration: boolean
  skippedLegacy: boolean
}

async function ensureTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      step text PRIMARY KEY,
      completed_at timestamptz NOT NULL DEFAULT now(),
      details jsonb
    )
  `)
}

async function isStepDone(pool: Pool, step: string): Promise<boolean> {
  const res = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ${TABLE} WHERE step = $1) AS exists`,
    [step],
  )
  return Boolean(res.rows[0]?.exists)
}

async function markStepDone(
  pool: Pool,
  step: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO ${TABLE} (step, details) VALUES ($1, $2::jsonb)
     ON CONFLICT (step) DO UPDATE SET completed_at = now(), details = EXCLUDED.details`,
    [step, JSON.stringify(details)],
  )
}

export async function runBootstrap(
  pool: Pool,
  log: BootstrapLogger = (msg) => console.log(msg),
): Promise<BootstrapResult> {
  await ensureTable(pool)

  const result: BootstrapResult = {
    ranSeed: false,
    ranLegacyMigration: false,
    skippedLegacy: false,
  }

  if (await isStepDone(pool, SEED_STEP)) {
    log(`[bootstrap] ${SEED_STEP} already recorded, skipping`)
  } else {
    log(`[bootstrap] running ${SEED_STEP}`)
    await runSeed(pool, log)
    await markStepDone(pool, SEED_STEP)
    result.ranSeed = true
  }

  if (await isStepDone(pool, LEGACY_STEP)) {
    log(`[bootstrap] ${LEGACY_STEP} already recorded, skipping`)
  } else if (await hasLegacyArtifacts(pool)) {
    log(`[bootstrap] running ${LEGACY_STEP}`)
    await runMigrateLegacy(pool, { dryRun: false, batchSize: 500 }, log)
    await markStepDone(pool, LEGACY_STEP, { ranAt: new Date().toISOString() })
    result.ranLegacyMigration = true
  } else {
    log(`[bootstrap] ${LEGACY_STEP} not needed (no legacy artifacts detected), marking done`)
    await markStepDone(pool, LEGACY_STEP, { skipped: true })
    result.skippedLegacy = true
  }

  return result
}
