import { z } from 'zod'
import { markError } from '@/server/services/order/process'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

const bodySchema = z.object({
  failed: z
    .array(
      z.object({
        amount: z.number(),
        reason: z.string(),
        at: z.string().optional(),
      }),
    )
    .min(1),
  remark: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid error request')

  const order = await markError({
    orderId: id,
    actor: { id: user.id, name: user.displayName || user.email },
    failed: parsed.data.failed,
    remark: parsed.data.remark,
  })
  return { order }
})
