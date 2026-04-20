import { z } from 'zod'
import { createOrder } from '@/server/services/order/createOrder'
import { requireCustomAuth } from '@/server/utils/customAuth'
import {
  externalOrderEnvelope,
  legacyEnvelope,
} from '@/server/utils/externalEnvelope'
import { logger } from '@/server/utils/logger'

const bodySchema = z.object({
  fullname: z.string().min(1),
  userId: z.string().min(1),
  responsePath: z.string().default(''),
  gender: z.string().default(''),
  phone: z.string().optional(),
  email: z.string().optional(),
  game: z.enum(['mlbb', 'pubg', 'wr', 'ff', 'genshin_impact', 'hok']),
  gameId: z.string().min(1),
  buyAmount: z.union([z.string(), z.number()]),
  paidAmount: z.union([z.string(), z.number()]),
  receiptUrl: z.string().default(''),
  source: z.enum(['flowxo_bot', 'manychat_bot', 'jg_internal_web']).default('flowxo_bot'),
  channel: z.enum(['web', 'messenger', 'telegram', 'whatsapp']).default('messenger'),
  language: z.enum(['Bahasa Melayu', 'English']).default('Bahasa Melayu'),
  supplier: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireCustomAuth(event)

  const rawBody = await readBody(event)
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    setResponseStatus(event, 400)
    return {
      message: 'Validation failed',
      errors: parsed.error.flatten(),
    }
  }

  try {
    const { order } = await createOrder({
      fullname: parsed.data.fullname,
      userId: parsed.data.userId,
      responsePath: parsed.data.responsePath,
      gender: parsed.data.gender,
      phone: parsed.data.phone,
      email: parsed.data.email,
      gameKey: parsed.data.game,
      gameId: parsed.data.gameId,
      buyAmount: parsed.data.buyAmount,
      paidAmount: parsed.data.paidAmount,
      receiptUrl: parsed.data.receiptUrl,
      source: parsed.data.source,
      channel: parsed.data.channel,
      language: parsed.data.language,
      supplierKey: parsed.data.supplier,
    })

    return legacyEnvelope(externalOrderEnvelope(order))
  } catch (err) {
    logger.error({ err, source: parsed.data.source }, 'order.create failed')
    setResponseStatus(event, 500)
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Internal error',
      data: null,
    }
  }
})
