import { desc, eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { supplierSubmissionTable } from '@/server/db/schema'
import { requireUser } from '@/server/utils/auth-guard'
import { notFound } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const db = useDb()
  const submissions = await db
    .select()
    .from(supplierSubmissionTable)
    .where(eq(supplierSubmissionTable.orderId, id))
    .orderBy(desc(supplierSubmissionTable.createdAt))

  return { submissions }
})
