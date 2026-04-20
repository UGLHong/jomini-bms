import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { configTable } from '@/server/db/schema'
import { requireUser } from '@/server/utils/auth-guard'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const db = useDb()
  const [row] = await db
    .select()
    .from(configTable)
    .where(eq(configTable.key, 'payment_announcement'))
    .limit(1)

  return { config: row?.value ?? null }
})
