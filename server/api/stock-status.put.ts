import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { stockTable } from '@/server/db/schema'
import { buildStockEnvelope } from '@/server/services/stock/stockStatus'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'
import { legacyEnvelope } from '@/server/utils/externalEnvelope'

const bodySchema = z.object({
  game: z.string().min(1),
  remainingStock: z.number().finite().optional(),
  outOfStockThreshold: z.number().int().nonnegative().optional(),
  stockAvailable: z.boolean().optional(),
  restockAt: z.string().datetime().nullable().optional(),
  custom: z.record(z.string(), z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid stock update')

  const db = useDb()
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.remainingStock !== undefined) patch.remainingStock = String(parsed.data.remainingStock)
  if (parsed.data.outOfStockThreshold !== undefined) patch.outOfStockThreshold = parsed.data.outOfStockThreshold
  if (parsed.data.stockAvailable !== undefined) patch.stockAvailable = parsed.data.stockAvailable
  if (parsed.data.restockAt !== undefined) {
    patch.restockAt = parsed.data.restockAt ? new Date(parsed.data.restockAt) : null
  }
  if (parsed.data.custom !== undefined) patch.custom = parsed.data.custom

  const [row] = await db
    .update(stockTable)
    .set(patch)
    .where(eq(stockTable.gameKey, parsed.data.game))
    .returning()

  if (!row) throw notFound('Stock row not found')

  return legacyEnvelope(buildStockEnvelope(row))
})
