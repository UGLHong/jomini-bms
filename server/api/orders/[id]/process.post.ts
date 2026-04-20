import { z } from 'zod'
import { startProcessing } from '@/server/services/order/process'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

const bodySchema = z.object({
  method: z.string().max(64).optional(),
})

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid process request')

  const order = await startProcessing({
    orderId: id,
    actor: { id: user.id, name: user.displayName || user.email },
    method: parsed.data.method,
  })
  return { order }
})
