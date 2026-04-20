import { z } from 'zod'
import { fetchReportRows } from '@/server/services/reports/reportService'
import { rowsToCsv } from '@/server/utils/csv'
import { requireUser } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const querySchema = z.object({
  from: z.string(),
  to: z.string(),
  gameKey: z.string().optional(),
  supplierKey: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw badRequest('Invalid report filters')

  const rows = await fetchReportRows({
    from: new Date(parsed.data.from),
    to: new Date(parsed.data.to),
    gameKey: parsed.data.gameKey,
    supplierKey: parsed.data.supplierKey,
  })

  const csv = rowsToCsv(
    rows.map((r) => ({
      orderId: r.id,
      createdAt: r.createdAt,
      doneAt: r.doneAt,
      status: r.processStatus,
      gameKey: r.gameKey,
      supplierKey: r.supplierKey,
      fullname: r.fullname,
      phone: r.phone,
      gameId: r.gameId,
      buyAmount: r.buyAmount,
      paidAmount: r.paidAmount,
      costPrice: r.costPrice,
      profit: r.profit,
      combination: r.amountCombinationString,
      channel: r.channel,
      source: r.source,
    })),
  )

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="orders-${parsed.data.from}-${parsed.data.to}.csv"`)
  return csv
})
