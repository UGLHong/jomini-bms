import { z } from 'zod'
import { markRejected } from '@/server/services/order/process'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

const bodySchema = z.object({
  remark: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid reject request')

  const order = await markRejected({
    orderId: id,
    actor: { id: user.id, name: user.displayName || user.email },
    remark: parsed.data.remark,
  })
  return { order }
})
