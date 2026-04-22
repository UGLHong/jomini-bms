import { describe, expect, it } from 'vitest'
import { buildStockEnvelope } from '@/server/services/stock/stockStatus'
import type { StockRow } from '@/server/db/schema'

function makeStock(partial: Partial<StockRow> = {}): StockRow {
  return {
    gameKey: 'mlbb',
    remainingStock: '1000',
    outOfStockThreshold: 0,
    stockAvailable: true,
    restockAt: null,
    custom: {},
    updatedAt: new Date('2026-02-01T00:00:00Z'),
    ...partial,
  }
}

describe('stock envelope', () => {
  it('matches legacy in-stock shape', () => {
    const env = buildStockEnvelope(makeStock())
    expect(env.game).toBe('mlbb')
    expect(env.outOfStock).toBe(false)
    expect(env.stockAvailable).toBe(true)
    expect(env.stockMessage).toContain('Stock available')
    expect(env.restockAtString).toBe('')
    expect(env.currentDateTime).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}, /)
  })

  it('flags out of stock when below threshold', () => {
    const env = buildStockEnvelope(
      makeStock({
        remainingStock: '5',
        outOfStockThreshold: 10,
        stockAvailable: false,
      }),
    )
    expect(env.outOfStock).toBe(true)
    expect(env.stockMessage).toContain('Out of stock')
  })
})
