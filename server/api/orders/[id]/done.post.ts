import { z } from 'zod'
import { markDone } from '@/server/services/order/process'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

const bodySchema = z.object({
  successful: z
    .array(
      z.object({
        amount: z.number(),
        combinationString: z.string().optional(),
        productId: z.string().optional(),
        resolvedAt: z.string().optional(),
      }),
    )
    .min(1),
  failed: z
    .array(
      z.object({
        amount: z.number(),
        reason: z.string(),
        at: z.string().optional(),
      }),
    )
    .optional(),
  remark: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid done request')

  const order = await markDone({
    orderId: id,
    actor: { id: user.id, name: user.displayName || user.email },
    successful: parsed.data.successful,
    failed: parsed.data.failed,
    remark: parsed.data.remark,
  })
  return { order }
})
