import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable, type OrderRow } from '@/server/db/schema'
import { parseAmount } from '@/server/utils/parseAmount'
import { acquireOrderEditLock } from './locks'

export type EditOrderPatch = {
  fullname?: string
  gender?: string
  phone?: string
  email?: string
  gameId?: string
  ign?: string
  buyAmount?: string | number
  paidAmount?: string | number
  costPrice?: string | number
  receiptUrl?: string
  remark?: string
  supplierKey?: string
  amountCombinationString?: string
  language?: string
}

export async function editOrder(orderId: string, patch: EditOrderPatch): Promise<OrderRow> {
  const db = useDb()
  return acquireOrderEditLock(orderId, async () => {
    const set: Partial<OrderRow> = { updatedAt: new Date() }

    if (patch.fullname !== undefined) set.fullname = patch.fullname
    if (patch.gender !== undefined) set.gender = patch.gender
    if (patch.phone !== undefined) set.phone = patch.phone
    if (patch.email !== undefined) set.email = patch.email
    if (patch.gameId !== undefined) set.gameId = patch.gameId
    if (patch.ign !== undefined) set.ign = patch.ign
    if (patch.receiptUrl !== undefined) set.receiptUrl = patch.receiptUrl
    if (patch.remark !== undefined) set.remark = patch.remark
    if (patch.supplierKey !== undefined) set.supplierKey = patch.supplierKey
    if (patch.amountCombinationString !== undefined) set.amountCombinationString = patch.amountCombinationString
    if (patch.language !== undefined) set.language = patch.language
    if (patch.buyAmount !== undefined) set.buyAmount = String(parseAmount(patch.buyAmount))
    if (patch.paidAmount !== undefined) set.paidAmount = String(parseAmount(patch.paidAmount))
    if (patch.costPrice !== undefined) set.costPrice = String(parseAmount(patch.costPrice))

    if (patch.paidAmount !== undefined || patch.costPrice !== undefined) {
      const paid = parseAmount(patch.paidAmount ?? 0)
      const cost = parseAmount(patch.costPrice ?? 0)
      set.profit = String(paid - cost)
    }

    const [row] = await db.update(orderTable).set(set).where(eq(orderTable.id, orderId)).returning()
    if (!row) throw new Error('Order not found')
    return row
  })
}
