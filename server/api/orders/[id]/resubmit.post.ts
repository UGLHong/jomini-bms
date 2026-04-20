import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable } from '@/server/db/schema'
import { dispatchOrderToSupplierApi } from '@/server/services/supplier-api/dispatch'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const db = useDb()
  const [order] = await db.select().from(orderTable).where(eq(orderTable.id, id)).limit(1)
  if (!order) throw notFound('Order not found')
  if (order.processStatus !== 'processing') {
    throw badRequest('Order must be in processing status to resubmit')
  }

  const result = await dispatchOrderToSupplierApi({ order })
  if (!result) {
    return { ok: false, reason: 'supplier_has_no_api_or_disabled' }
  }

  return { ok: true, ...result }
})
