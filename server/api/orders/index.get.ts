import { z } from 'zod'
import { listOrders } from '@/server/services/order/listOrders'
import { requireUser } from '@/server/utils/auth-guard'
import type { ProcessStatus } from '@/server/db/schema'

const querySchema = z.object({
  status: z.string().optional(),
  gameKey: z.string().optional(),
  supplierKey: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const allowedStatus = new Set<ProcessStatus>(['open', 'processing', 'done', 'error', 'closed', 'refund'])

export default defineEventHandler(async (event) => {
  requireUser(event)
  const parsed = querySchema.parse(getQuery(event))

  const statuses = parsed.status
    ? parsed.status
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ProcessStatus => allowedStatus.has(s as ProcessStatus))
    : undefined

  return listOrders({
    statuses,
    gameKey: parsed.gameKey,
    supplierKey: parsed.supplierKey,
    search: parsed.search,
    from: parsed.from ? new Date(parsed.from) : undefined,
    to: parsed.to ? new Date(parsed.to) : undefined,
    limit: parsed.limit,
    offset: parsed.offset,
  })
})
