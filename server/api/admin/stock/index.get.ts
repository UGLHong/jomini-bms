import { asc } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { stockTable } from '@/server/db/schema'
import { requireUser } from '@/server/utils/auth-guard'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const db = useDb()
  const rows = await db.select().from(stockTable).orderBy(asc(stockTable.gameKey))
  return { stock: rows }
})
