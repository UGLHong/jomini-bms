import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { configTable, gameTable, productTable, stockTable } from '@/server/db/schema'
import { loadActiveLink } from '@/server/services/external/linkService'
import { notFound } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  const externalId = getRouterParam(event, 'externalId')
  if (!externalId) throw notFound('Link not found')

  const link = await loadActiveLink(externalId)
  if (!link) throw notFound('Link expired or not found')

  const db = useDb()
  const games = await db.select().from(gameTable).where(eq(gameTable.enabled, true))
  const stocks = await db.select().from(stockTable)
  const products = await db.select().from(productTable).where(eq(productTable.status, 'active'))

  const [announcement] = await db
    .select({ value: configTable.value })
    .from(configTable)
    .where(eq(configTable.key, 'payment_announcement'))
    .limit(1)

  return {
    link: {
      externalId: link.externalId,
      expiresAt: link.expiresAt,
      responsePath: link.responsePath,
    },
    games,
    stocks,
    products,
    announcement: announcement?.value ?? null,
  }
})
