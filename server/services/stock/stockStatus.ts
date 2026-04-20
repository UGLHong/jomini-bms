import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { stockTable, type StockRow } from '@/server/db/schema'
import { formatMytDateTime } from '@/server/utils/externalEnvelope'

export type StockStatusEnvelope = {
  id: string
  game: string
  remainingStock: number
  outOfStockThreshold: number
  stockAvailable: boolean
  restockAt: string
  custom: Record<string, unknown>
  restockAtString: string
  outOfStock: boolean
  currentDateTime: string
  stockMessage: string
}

export async function readStockStatus(gameKey: string): Promise<StockStatusEnvelope | null> {
  const db = useDb()
  const [row]: StockRow[] = await db.select().from(stockTable).where(eq(stockTable.gameKey, gameKey)).limit(1)
  if (!row) return null
  return buildStockEnvelope(row)
}

export function buildStockEnvelope(row: StockRow): StockStatusEnvelope {
  const remaining = Number(row.remainingStock ?? 0)
  const threshold = Number(row.outOfStockThreshold ?? 0)
  const outOfStock = !row.stockAvailable || remaining <= threshold
  const restockIso = row.restockAt ? row.restockAt.toISOString() : ''

  return {
    id: row.gameKey,
    game: row.gameKey,
    remainingStock: remaining,
    outOfStockThreshold: threshold,
    stockAvailable: Boolean(row.stockAvailable),
    restockAt: restockIso,
    custom: (row.custom ?? {}) as Record<string, unknown>,
    restockAtString: formatMytDateTime(row.restockAt ?? null),
    outOfStock,
    currentDateTime: formatMytDateTime(new Date()),
    stockMessage: outOfStock
      ? `❌ Out of stock${restockIso ? `, restock at ${formatMytDateTime(row.restockAt!)}` : ''}`
      : '👍🏼 Stock available',
  }
}
