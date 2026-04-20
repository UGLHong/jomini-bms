import { z } from 'zod'
import { editOrder } from '@/server/services/order/edit'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

const bodySchema = z.object({
  fullname: z.string().max(200).optional(),
  gender: z.string().max(20).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  gameId: z.string().max(200).optional(),
  ign: z.string().max(200).optional(),
  buyAmount: z.union([z.number(), z.string()]).optional(),
  paidAmount: z.union([z.number(), z.string()]).optional(),
  costPrice: z.union([z.number(), z.string()]).optional(),
  receiptUrl: z.string().max(500).optional(),
  remark: z.string().max(1000).optional(),
  supplierKey: z.string().max(80).optional(),
  amountCombinationString: z.string().max(500).optional(),
  language: z.string().max(40).optional(),
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw notFound('Order not found')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid order patch')

  const order = await editOrder(id, parsed.data)
  return { order }
})
