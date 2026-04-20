import { and, eq, gte, lt, type SQL } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable, type OrderRow, type ProcessStatus } from '@/server/db/schema'

export type ReportFilter = {
  from: Date
  to: Date
  gameKey?: string
  supplierKey?: string
  statuses?: ProcessStatus[]
}

export type ReportKpi = {
  totalOrders: number
  totalDone: number
  totalIncome: number
  totalCost: number
  totalProfit: number
  doneRatio: number
}

export type ReportSeriesPoint = {
  date: string
  count: number
  profit: number
}

export type ReportBreakdown = {
  gameKey: string
  supplierKey: string
  count: number
  doneCount: number
  profit: number
}

function buildConditions(filter: ReportFilter): SQL[] {
  const conditions: SQL[] = [
    gte(orderTable.createdAt, filter.from),
    lt(orderTable.createdAt, filter.to),
  ]
  if (filter.gameKey) conditions.push(eq(orderTable.gameKey, filter.gameKey))
  if (filter.supplierKey) conditions.push(eq(orderTable.supplierKey, filter.supplierKey))
  return conditions
}

export async function fetchReportRows(filter: ReportFilter): Promise<OrderRow[]> {
  const db = useDb()
  return db
    .select()
    .from(orderTable)
    .where(and(...buildConditions(filter)))
}

export function computeKpi(rows: OrderRow[]): ReportKpi {
  let totalIncome = 0
  let totalCost = 0
  let totalProfit = 0
  let totalDone = 0

  for (const r of rows) {
    totalIncome += Number(r.paidAmount || 0)
    totalCost += Number(r.costPrice || 0)
    totalProfit += Number(r.profit || 0)
    if (r.processStatus === 'done') totalDone += 1
  }

  return {
    totalOrders: rows.length,
    totalDone,
    totalIncome,
    totalCost,
    totalProfit,
    doneRatio: rows.length ? Math.round((totalDone / rows.length) * 100) : 0,
  }
}

export function computeDailySeries(rows: OrderRow[]): ReportSeriesPoint[] {
  const buckets = new Map<string, ReportSeriesPoint>()
  for (const r of rows) {
    const date = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)
    const ymd = date.toISOString().slice(0, 10)
    const prev = buckets.get(ymd) ?? { date: ymd, count: 0, profit: 0 }
    prev.count += 1
    prev.profit += Number(r.profit || 0)
    buckets.set(ymd, prev)
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function computeBreakdown(rows: OrderRow[]): ReportBreakdown[] {
  const map = new Map<string, ReportBreakdown>()
  for (const r of rows) {
    const key = `${r.gameKey}|${r.supplierKey}`
    const prev =
      map.get(key) ??
      { gameKey: r.gameKey, supplierKey: r.supplierKey, count: 0, doneCount: 0, profit: 0 }
    prev.count += 1
    if (r.processStatus === 'done') prev.doneCount += 1
    prev.profit += Number(r.profit || 0)
    map.set(key, prev)
  }
  return Array.from(map.values()).sort((a, b) => b.profit - a.profit)
}
