import { and, eq, sql } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable, type OrderRow, type ProcessCombination, type ProcessFailure } from '@/server/db/schema'
import { notifyOrderDone, notifyOrderRejected } from '@/server/services/notify/dispatch'
import { logger } from '@/server/utils/logger'
import { acquireOrderEditLock } from './locks'

type Actor = { id: string; name: string }

export type ProcessOrderInput = {
  orderId: string
  actor: Actor
  method?: string
  newPending?: ProcessCombination[]
  newSuccessful?: ProcessCombination[]
  newFailed?: ProcessFailure[]
  remark?: string
}

export async function startProcessing({ orderId, actor, method }: {
  orderId: string
  actor: Actor
  method?: string
}): Promise<OrderRow> {
  const db = useDb()
  const row = await acquireOrderEditLock(orderId, async () => {
    const [updated] = await db
      .update(orderTable)
      .set({
        processStatus: 'processing',
        processAt: new Date(),
        lastProcessBy: actor,
        processMethod: method ?? sql`${orderTable.processMethod}`,
        updatedAt: new Date(),
      })
      .where(and(eq(orderTable.id, orderId), eq(orderTable.processStatus, 'open')))
      .returning()
    if (!updated) throw new Error('Order not open or not found')
    return updated
  })

  const { dispatchOrderToSupplierApi } = await import('@/server/services/supplier-api/dispatch')
  dispatchOrderToSupplierApi({ order: row }).catch((err) =>
    logger.warn({ err, orderId: row.id }, '[order] supplier-api dispatch failed'),
  )

  return row
}

export async function markDone({ orderId, actor, successful, failed, remark }: {
  orderId: string
  actor: Actor
  successful: ProcessCombination[]
  failed?: ProcessFailure[]
  remark?: string
}): Promise<OrderRow> {
  const db = useDb()
  return acquireOrderEditLock(orderId, async () => {
    const [row] = await db
      .update(orderTable)
      .set({
        processStatus: 'done',
        processSuccessful: successful,
        processPending: [],
        processFailed: failed ?? [],
        doneAt: new Date(),
        lastProcessBy: actor,
        remark: remark ?? sql`${orderTable.remark}`,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId))
      .returning()
    if (!row) throw new Error('Order not found')
    notifyOrderDone(row).catch((err) => logger.warn({ err, orderId: row.id }, '[order] notify done failed'))
    return row
  })
}

export async function markRejected({ orderId, actor, remark }: {
  orderId: string
  actor: Actor
  remark?: string
}): Promise<OrderRow> {
  const db = useDb()
  return acquireOrderEditLock(orderId, async () => {
    const [row] = await db
      .update(orderTable)
      .set({
        processStatus: 'closed',
        lastProcessBy: actor,
        remark: remark ?? sql`${orderTable.remark}`,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId))
      .returning()
    if (!row) throw new Error('Order not found')
    notifyOrderRejected(row).catch((err) => logger.warn({ err, orderId: row.id }, '[order] notify rejected failed'))
    return row
  })
}

export async function markRefund({ orderId, actor, remark }: {
  orderId: string
  actor: Actor
  remark?: string
}): Promise<OrderRow> {
  const db = useDb()
  return acquireOrderEditLock(orderId, async () => {
    const [row] = await db
      .update(orderTable)
      .set({
        processStatus: 'refund',
        lastProcessBy: actor,
        remark: remark ?? sql`${orderTable.remark}`,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId))
      .returning()
    if (!row) throw new Error('Order not found')
    return row
  })
}

export async function markError({ orderId, actor, failed, remark }: {
  orderId: string
  actor: Actor
  failed: ProcessFailure[]
  remark?: string
}): Promise<OrderRow> {
  const db = useDb()
  return acquireOrderEditLock(orderId, async () => {
    const [row] = await db
      .update(orderTable)
      .set({
        processStatus: 'error',
        processFailed: failed,
        lastProcessBy: actor,
        remark: remark ?? sql`${orderTable.remark}`,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId))
      .returning()
    if (!row) throw new Error('Order not found')
    return row
  })
}
