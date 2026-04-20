import { and, eq, inArray, lt } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable } from '@/server/db/schema'

export async function archiveClosedOrders(olderThan: Date): Promise<number> {
  const db = useDb()
  const rows = await db
    .update(orderTable)
    .set({ updatedAt: new Date() })
    .where(and(inArray(orderTable.processStatus, ['closed', 'refund']), lt(orderTable.updatedAt, olderThan)))
    .returning({ id: orderTable.id })
  return rows.length
}

export async function deleteOrder(orderId: string): Promise<void> {
  const db = useDb()
  await db.delete(orderTable).where(eq(orderTable.id, orderId))
}
