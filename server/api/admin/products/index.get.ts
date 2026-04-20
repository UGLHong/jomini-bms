import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { productTable } from '@/server/db/schema'
import { requireUser } from '@/server/utils/auth-guard'

const querySchema = z.object({
  game: z.string().optional(),
  supplier: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const parsed = querySchema.safeParse(getQuery(event))
  const filters = parsed.success ? parsed.data : {}

  const conditions = [] as Array<ReturnType<typeof eq>>
  if (filters.game) conditions.push(eq(productTable.gameKey, filters.game))
  if (filters.supplier) conditions.push(eq(productTable.supplierKey, filters.supplier))

  const db = useDb()
  const rows = await db
    .select()
    .from(productTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(productTable.gameKey), asc(productTable.supplierKey), asc(productTable.sortOrder), asc(productTable.name))

  return { products: rows }
})
