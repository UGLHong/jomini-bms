import { z } from 'zod'
import { createOrder } from '@/server/services/order/createOrder'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const bodySchema = z.object({
  fullname: z.string().min(1).max(200),
  userId: z.string().max(128).optional(),
  responsePath: z.string().max(200).optional(),
  gender: z.string().max(20).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(200).optional().or(z.literal('')),
  gameKey: z.string().min(1),
  gameId: z.string().min(1),
  buyAmount: z.union([z.number(), z.string()]),
  paidAmount: z.union([z.number(), z.string()]),
  receiptUrl: z.string().max(500).optional(),
  supplierKey: z.string().max(80).optional(),
  remark: z.string().max(1000).optional(),
  language: z.string().max(40).optional(),
})

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid manual order', parsed.error.flatten())

  const { order } = await createOrder({
    fullname: parsed.data.fullname,
    userId: parsed.data.userId ?? user.id,
    responsePath: parsed.data.responsePath,
    gender: parsed.data.gender,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    gameKey: parsed.data.gameKey,
    gameId: parsed.data.gameId,
    buyAmount: parsed.data.buyAmount,
    paidAmount: parsed.data.paidAmount,
    receiptUrl: parsed.data.receiptUrl,
    source: 'jg_internal_web',
    channel: 'web',
    language: parsed.data.language,
    supplierKey: parsed.data.supplierKey,
    remark: parsed.data.remark,
  })

  return { order }
})
