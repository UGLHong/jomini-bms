import { and, desc, eq, gte, ilike, inArray, lte, or, type SQL } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable, type OrderRow, type ProcessStatus } from '@/server/db/schema'

export type OrderListFilter = {
  statuses?: ProcessStatus[]
  gameKey?: string
  supplierKey?: string
  search?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export type OrderListResult = {
  orders: OrderRow[]
  nextOffset: number | null
}

export async function listOrders(filter: OrderListFilter): Promise<OrderListResult> {
  const db = useDb()
  const conditions: SQL[] = []

  if (filter.statuses?.length) conditions.push(inArray(orderTable.processStatus, filter.statuses))
  if (filter.gameKey) conditions.push(eq(orderTable.gameKey, filter.gameKey))
  if (filter.supplierKey) conditions.push(eq(orderTable.supplierKey, filter.supplierKey))
  if (filter.from) conditions.push(gte(orderTable.createdAt, filter.from))
  if (filter.to) conditions.push(lte(orderTable.createdAt, filter.to))

  if (filter.search) {
    const like = `%${filter.search}%`
    const searchClause = or(
      ilike(orderTable.fullname, like),
      ilike(orderTable.phone, like),
      ilike(orderTable.gameId, like),
      ilike(orderTable.id, like),
    )
    if (searchClause) conditions.push(searchClause)
  }

  const limit = Math.min(filter.limit ?? 50, 200)
  const offset = Math.max(filter.offset ?? 0, 0)

  const rows = await db
    .select()
    .from(orderTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orderTable.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  const orders = hasMore ? rows.slice(0, limit) : rows

  return {
    orders,
    nextOffset: hasMore ? offset + limit : null,
  }
}

export async function getOrder(orderId: string): Promise<OrderRow | null> {
  const db = useDb()
  const [row] = await db.select().from(orderTable).where(eq(orderTable.id, orderId)).limit(1)
  return row ?? null
}
