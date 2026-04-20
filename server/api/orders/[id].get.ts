import { getOrder } from '@/server/services/order/listOrders'
import { requireUser } from '@/server/utils/auth-guard'
import { notFound } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const order = await getOrder(id)
  if (!order) throw notFound('Order not found')

  return { order }
})
