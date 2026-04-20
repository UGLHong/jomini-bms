import { and, eq, gte, inArray, lt } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable } from '@/server/db/schema'

function startOfMytDay(date: Date): Date {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - 8 * 60 * 60 * 1000)
}

export type DailySummaryRow = {
  gameKey: string
  supplierKey: string
  totalOrders: number
  doneOrders: number
  totalIncome: number
  totalCost: number
  totalProfit: number
}

export async function computeDailySummary(day: Date): Promise<DailySummaryRow[]> {
  const db = useDb()
  const from = startOfMytDay(day)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)

  const rows = await db
    .select()
    .from(orderTable)
    .where(
      and(
        gte(orderTable.createdAt, from),
        lt(orderTable.createdAt, to),
        inArray(orderTable.processStatus, ['done', 'error', 'closed', 'refund', 'processing', 'open']),
      ),
    )

  const aggMap = new Map<string, DailySummaryRow>()
  for (const r of rows) {
    const key = `${r.gameKey}|${r.supplierKey}`
    const prev =
      aggMap.get(key) ??
      {
        gameKey: r.gameKey,
        supplierKey: r.supplierKey,
        totalOrders: 0,
        doneOrders: 0,
        totalIncome: 0,
        totalCost: 0,
        totalProfit: 0,
      }
    prev.totalOrders += 1
    if (r.processStatus === 'done') prev.doneOrders += 1
    prev.totalIncome += Number(r.paidAmount || 0)
    prev.totalCost += Number(r.costPrice || 0)
    prev.totalProfit += Number(r.profit || 0)
    aggMap.set(key, prev)
  }
  return Array.from(aggMap.values())
}

export async function supplierDailyCounts(day: Date, supplierKey: string): Promise<number> {
  const db = useDb()
  const from = startOfMytDay(day)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  const rows = await db
    .select({ id: orderTable.id })
    .from(orderTable)
    .where(
      and(
        gte(orderTable.createdAt, from),
        lt(orderTable.createdAt, to),
        eq(orderTable.supplierKey, supplierKey),
        eq(orderTable.processStatus, 'done'),
      ),
    )
  return rows.length
}
