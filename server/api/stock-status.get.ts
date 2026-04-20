import { z } from 'zod'
import { readStockStatus } from '@/server/services/stock/stockStatus'
import { requireCustomAuth } from '@/server/utils/customAuth'
import { legacyEnvelope } from '@/server/utils/externalEnvelope'

const querySchema = z.object({
  game: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  requireCustomAuth(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    setResponseStatus(event, 400)
    return { message: 'Missing or invalid game' }
  }

  const status = await readStockStatus(parsed.data.game)
  if (!status) {
    setResponseStatus(event, 404)
    return { message: 'Status not found' }
  }

  return legacyEnvelope(status)
})
