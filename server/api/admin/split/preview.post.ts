import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import {
  productTable,
  supplierGameTable,
  type SupplierGameMetadata,
} from '@/server/db/schema'
import { runDenominationSplit } from '@/server/services/order/denomination-split'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const bodySchema = z.object({
  gameKey: z.string().min(1),
  supplierKey: z.string().min(1),
  amount: z.number().finite().positive(),
  strategy: z
    .enum(['greedy_largest_first', 'fewest_splits', 'min_cost', 'manual_override'])
    .optional(),
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid split preview request')

  const db = useDb()
  const [sg] = await db
    .select({ metadata: supplierGameTable.metadata })
    .from(supplierGameTable)
    .where(
      and(
        eq(supplierGameTable.gameKey, parsed.data.gameKey),
        eq(supplierGameTable.supplierKey, parsed.data.supplierKey),
      ),
    )
    .limit(1)

  const products = await db
    .select()
    .from(productTable)
    .where(
      and(
        eq(productTable.gameKey, parsed.data.gameKey),
        eq(productTable.supplierKey, parsed.data.supplierKey),
      ),
    )

  const result = runDenominationSplit({
    amount: parsed.data.amount,
    gameKey: parsed.data.gameKey,
    supplierKey: parsed.data.supplierKey,
    products,
    strategy: parsed.data.strategy,
    supplierGameMeta: sg?.metadata as SupplierGameMetadata | null,
  })

  return { split: result }
})
