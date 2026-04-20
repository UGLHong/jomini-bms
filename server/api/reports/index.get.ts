import { z } from 'zod'
import {
  computeBreakdown,
  computeDailySeries,
  computeKpi,
  fetchReportRows,
} from '@/server/services/reports/reportService'
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

  const from = new Date(parsed.data.from)
  const to = new Date(parsed.data.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw badRequest('Invalid date range')
  }

  const rows = await fetchReportRows({
    from,
    to,
    gameKey: parsed.data.gameKey,
    supplierKey: parsed.data.supplierKey,
  })

  return {
    kpi: computeKpi(rows),
    series: computeDailySeries(rows),
    breakdown: computeBreakdown(rows),
  }
})
