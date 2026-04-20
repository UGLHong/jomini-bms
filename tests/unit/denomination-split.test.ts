import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { runDenominationSplit } from '@/server/services/order/denomination-split'
import type { ProductRow } from '@/server/db/schema'

function makeProduct(partial: Partial<ProductRow> & Pick<ProductRow, 'amount' | 'cost' | 'name'>): ProductRow {
  return {
    id: crypto.randomUUID(),
    gameKey: 'mlbb',
    supplierKey: 'smile',
    name: partial.name,
    amount: partial.amount,
    combination: partial.combination ?? '',
    isBaseAmount: partial.isBaseAmount ?? true,
    cost: partial.cost,
    selling: partial.selling ?? '0',
    status: partial.status ?? 'active',
    sortOrder: 0,
    metadata: partial.metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const mlbbBase: ProductRow[] = [
  makeProduct({ name: '11 Diamonds', amount: '11', cost: '0.68' }),
  makeProduct({ name: '22 Diamonds', amount: '22', cost: '1.36' }),
  makeProduct({ name: '56 Diamonds', amount: '56', cost: '3.30' }),
  makeProduct({ name: '86 Diamonds', amount: '86', cost: '4.95' }),
  makeProduct({ name: '172 Diamonds', amount: '172', cost: '9.9' }),
  makeProduct({ name: '257 Diamonds', amount: '257', cost: '14.85' }),
  makeProduct({ name: '344 Diamonds', amount: '344', cost: '19.8' }),
  makeProduct({ name: '706 Diamonds', amount: '706', cost: '39.6' }),
]

describe('denomination split — greedy', () => {
  it('returns empty for zero amount', () => {
    const res = runDenominationSplit({
      amount: 0,
      gameKey: 'mlbb',
      supplierKey: 'smile',
      products: mlbbBase,
    })
    expect(res.splits).toHaveLength(0)
    expect(res.remainder).toBe(0)
  })

  it('picks largest base first for 172', () => {
    const res = runDenominationSplit({
      amount: 172,
      gameKey: 'mlbb',
      supplierKey: 'smile',
      products: mlbbBase,
    })
    expect(res.splits.map((s) => s.amount)).toEqual([172])
    expect(res.totalCost).toBeCloseTo(9.9, 2)
    expect(res.remainder).toBe(0)
  })

  it('reports remainder when no perfect match exists', () => {
    const res = runDenominationSplit({
      amount: 5,
      gameKey: 'mlbb',
      supplierKey: 'smile',
      products: mlbbBase,
    })
    expect(res.remainder).toBeGreaterThan(0)
    expect(res.failed[0]?.reason).toBe('no_denomination_match')
  })
})

describe('denomination split — min_cost strategy', () => {
  it('prefers cheaper combinations when available', () => {
    const products = [
      makeProduct({ name: 'Pack A', amount: '10', cost: '5.00' }),
      makeProduct({ name: 'Pack B', amount: '20', cost: '9.00' }),
    ]
    const greedy = runDenominationSplit({
      amount: 20,
      gameKey: 'mlbb',
      supplierKey: 'smile',
      products,
      strategy: 'greedy_largest_first',
    })
    const minCost = runDenominationSplit({
      amount: 20,
      gameKey: 'mlbb',
      supplierKey: 'smile',
      products,
      strategy: 'min_cost',
    })
    expect(minCost.totalCost).toBeLessThanOrEqual(greedy.totalCost)
  })
})

describe('denomination split — manual_override', () => {
  it('uses declarative override when present on a product', () => {
    const override = makeProduct({
      name: '172 Diamonds',
      amount: '172',
      cost: '9.9',
      metadata: { splitOverride: { '172': '86 + 86' } },
    })
    const products = [
      makeProduct({ name: '86 Diamonds', amount: '86', cost: '4.95' }),
      override,
    ]
    const res = runDenominationSplit({
      amount: 172,
      gameKey: 'mlbb',
      supplierKey: 'smile',
      products,
    })
    expect(res.strategyUsed).toBe('manual_override')
    expect(res.splits.map((s) => s.amount)).toEqual([86, 86])
    expect(res.totalCost).toBeCloseTo(9.9, 2)
  })
})

describe('denomination split — property: total amount <= target', () => {
  it('never over-matches the target', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5000 }), (target) => {
        const res = runDenominationSplit({
          amount: target,
          gameKey: 'mlbb',
          supplierKey: 'smile',
          products: mlbbBase,
        })
        const matched = res.splits.reduce((s, x) => s + x.amount, 0)
        expect(matched).toBeLessThanOrEqual(target + 1e-6)
        expect(matched + res.remainder).toBeCloseTo(target, 1)
      }),
      { numRuns: 60 },
    )
  })
})
