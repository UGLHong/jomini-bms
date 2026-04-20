import { z } from 'zod'
import {
  computeBreakdown,
  computeDailySeries,
  fetchReportRows,
} from '@/server/services/reports/reportService'
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

  const series = computeDailySeries(rows)
  const breakdown = computeBreakdown(rows)

  const csv =
    '# Daily series\n' +
    rowsToCsv(series) +
    '\n# Game/Supplier breakdown\n' +
    rowsToCsv(breakdown)

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="summary-${parsed.data.from}-${parsed.data.to}.csv"`)
  return csv
})
