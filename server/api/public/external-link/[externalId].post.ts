import { z } from 'zod'
import { createOrder } from '@/server/services/order/createOrder'
import { consumeLink, loadActiveLink } from '@/server/services/external/linkService'
import { badRequest, notFound } from '@/server/utils/errors'
import { clientKey, hitRateLimit } from '@/server/utils/rateLimit'

const bodySchema = z.object({
  fullname: z.string().min(1).max(200),
  phone: z.string().min(1).max(40),
  email: z.string().email().max(200).optional().or(z.literal('')),
  gameKey: z.string().min(1),
  gameId: z.string().min(1),
  buyAmount: z.union([z.number(), z.string()]),
  paidAmount: z.union([z.number(), z.string()]),
  receiptUrl: z.string().max(500).optional(),
  language: z.string().max(40).optional(),
  supplierKey: z.string().max(80).optional(),
})

export default defineEventHandler(async (event) => {
  const externalId = getRouterParam(event, 'externalId')
  if (!externalId) throw notFound('Link not found')

  const limited = hitRateLimit({ key: `public-submit:${clientKey(event)}`, windowMs: 60_000, max: 20 })
  if (!limited.allowed) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', Math.ceil(limited.retryAfterMs / 1000))
    return { error: 'Too many requests' }
  }

  const link = await loadActiveLink(externalId)
  if (!link) throw notFound('Link expired or not found')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid submission', parsed.error.flatten())

  const { order } = await createOrder({
    fullname: parsed.data.fullname,
    userId: link.userId || `external:${externalId}`,
    responsePath: link.responsePath,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    gameKey: parsed.data.gameKey,
    gameId: parsed.data.gameId,
    buyAmount: parsed.data.buyAmount,
    paidAmount: parsed.data.paidAmount,
    receiptUrl: parsed.data.receiptUrl,
    source: 'public_form',
    channel: 'web',
    language: parsed.data.language,
    supplierKey: parsed.data.supplierKey,
  })

  await consumeLink(externalId, order.id)

  return { ok: true, orderId: order.id }
})
