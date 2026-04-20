import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { getPool } from '@/server/db/client'

function lockKey(key: string | Record<string, unknown>): bigint {
  const src = typeof key === 'string' ? key : JSON.stringify(key)
  const digest = createHash('sha256').update(src).digest()
  const hi = digest.readBigUInt64BE(0)
  return BigInt.asIntN(64, hi)
}

export async function withAdvisoryLock<T>(
  key: string | Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const k = lockKey(key).toString()
    await client.query(`SELECT pg_advisory_xact_lock($1::bigint)`, [k])
    const out = await fn()
    await client.query('COMMIT')
    return out
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function acquireOrderLock<T>(
  key: { game: string; gameId: string },
  fn: () => Promise<T>,
): Promise<T> {
  return withAdvisoryLock({ scope: 'order_create', ...key }, fn)
}

export async function acquireOrderEditLock<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
  return withAdvisoryLock({ scope: 'order_edit', orderId }, fn)
}

export async function tryAcquireRelayLock(orderMsgId: string): Promise<boolean> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const k = lockKey({ scope: 'relay', id: orderMsgId }).toString()
    const res = await client.query<{ pg_try_advisory_lock: boolean }>(
      'SELECT pg_try_advisory_lock($1::bigint) as pg_try_advisory_lock',
      [k],
    )
    return res.rows[0]?.pg_try_advisory_lock ?? false
  } finally {
    client.release()
  }
}

// runs fn only if this process is the sole holder of a named lock; otherwise returns null
export async function tryWithNamedLock<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  const pool = getPool()
  const client = await pool.connect()
  const k = lockKey({ scope: 'named', name }).toString()
  try {
    const res = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1::bigint) as locked',
      [k],
    )
    if (!res.rows[0]?.locked) return null
    try {
      return await fn()
    } finally {
      await client.query('SELECT pg_advisory_unlock($1::bigint)', [k]).catch(() => {})
    }
  } finally {
    client.release()
  }
}

export const _internal = { lockKey, sql }
