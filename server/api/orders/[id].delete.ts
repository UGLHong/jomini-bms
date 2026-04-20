import { deleteOrder } from '@/server/services/order/archive'
import { requireAdmin } from '@/server/utils/auth-guard'
import { notFound } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')
  await deleteOrder(id)
  return { ok: true }
})
