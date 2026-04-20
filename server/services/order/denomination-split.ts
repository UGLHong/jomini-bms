import type { ProductRow, SupplierGameMetadata } from '@/server/db/schema'
import type { ProcessCombination, ProcessFailure } from '@/server/db/schema'

export type SplitStrategy = 'greedy_largest_first' | 'fewest_splits' | 'min_cost' | 'manual_override'

export type DenominationInput = {
  amount: number
  gameKey: string
  supplierKey: string
  products: ProductRow[]
  strategy?: SplitStrategy
  supplierGameMeta?: SupplierGameMetadata | null
}

export type DenominationResult = {
  combinationString: string
  totalCost: number
  splits: ProcessCombination[]
  failed: ProcessFailure[]
  remainder: number
  strategyUsed: SplitStrategy
}

type NumericProduct = {
  product: ProductRow
  amount: number
  cost: number
}

function toNumericProducts(products: ProductRow[]): NumericProduct[] {
  return products
    .map((p) => ({
      product: p,
      amount: Number.parseFloat(String(p.amount)),
      cost: Number.parseFloat(String(p.cost)),
    }))
    .filter((p) => Number.isFinite(p.amount) && p.amount > 0 && p.product.status !== 'disabled')
}

function manualOverride(
  amount: number,
  products: ProductRow[],
  gameKey: string,
  supplierKey: string,
): DenominationResult | null {
  const match = products.find((p) => {
    if (p.gameKey !== gameKey || p.supplierKey !== supplierKey) return false
    const meta = p.metadata ?? {}
    const override = meta.splitOverride
    if (!override) return false
    return Object.prototype.hasOwnProperty.call(override, String(amount))
  })
  if (!match) return null

  const override = match.metadata?.splitOverride?.[String(amount)]
  if (!override) return null

  const byName = new Map(products.map((p) => [`${p.name}|${p.amount}`, p] as const))
  const pieces = override
    .split(/\s*\+\s*/)
    .map((token) => token.trim())
    .filter(Boolean)

  const splits: ProcessCombination[] = []
  const failed: ProcessFailure[] = []
  let totalCost = 0
  let matchedTotal = 0

  for (const piece of pieces) {
    const parsed = Number.parseFloat(piece)
    if (!Number.isFinite(parsed)) {
      failed.push({ amount: 0, reason: `invalid_override_piece:${piece}`, at: new Date().toISOString() })
      continue
    }
    const candidate =
      [...byName.values()].find((p) => Number(p.amount) === parsed) ??
      [...byName.values()].find((p) => p.combination === piece)
    if (!candidate) {
      failed.push({ amount: parsed, reason: 'override_piece_missing' })
      continue
    }
    totalCost += Number(candidate.cost)
    matchedTotal += Number(candidate.amount)
    splits.push({ amount: Number(candidate.amount), combinationString: candidate.combination || candidate.name, productId: candidate.id })
  }

  return {
    combinationString: splits.map((s) => s.combinationString || String(s.amount)).join(' + '),
    totalCost,
    splits,
    failed,
    remainder: Math.max(0, amount - matchedTotal),
    strategyUsed: 'manual_override',
  }
}

function greedyLargestFirst(input: DenominationInput): DenominationResult {
  const numeric = toNumericProducts(input.products)
  const base = numeric.filter((n) => n.product.isBaseAmount).sort((a, b) => b.amount - a.amount)

  let remainder = input.amount
  let totalCost = 0
  const splits: ProcessCombination[] = []

  for (const candidate of base) {
    if (remainder <= 0) break
    while (remainder + 1e-6 >= candidate.amount) {
      remainder = Number((remainder - candidate.amount).toFixed(6))
      totalCost += candidate.cost
      splits.push({
        amount: candidate.amount,
        combinationString: candidate.product.combination || candidate.product.name,
        productId: candidate.product.id,
      })
    }
  }

  const failed: ProcessFailure[] = []
  if (remainder > 1e-6) {
    failed.push({ amount: remainder, reason: 'no_denomination_match' })
  }

  return {
    combinationString: splits.map((s) => s.combinationString || String(s.amount)).join(' + '),
    totalCost,
    splits,
    failed,
    remainder: remainder > 1e-6 ? remainder : 0,
    strategyUsed: 'greedy_largest_first',
  }
}

function minCost(input: DenominationInput): DenominationResult {
  const numeric = toNumericProducts(input.products).filter((n) => n.product.isBaseAmount)
  const target = input.amount
  if (target <= 0) {
    return {
      combinationString: '',
      totalCost: 0,
      splits: [],
      failed: [],
      remainder: 0,
      strategyUsed: 'min_cost',
    }
  }

  const INT_SCALE = 1
  const scaledTarget = Math.round(target * INT_SCALE)
  const dp = new Array<number>(scaledTarget + 1).fill(Infinity)
  const pick = new Array<NumericProduct | null>(scaledTarget + 1).fill(null)
  dp[0] = 0

  for (let i = 1; i <= scaledTarget; i += 1) {
    for (const n of numeric) {
      const aInt = Math.round(n.amount * INT_SCALE)
      if (aInt <= i && dp[i - aInt] + n.cost < dp[i]!) {
        dp[i] = dp[i - aInt]! + n.cost
        pick[i] = n
      }
    }
  }

  let idx = scaledTarget
  while (idx > 0 && !Number.isFinite(dp[idx]!)) idx -= 1

  const splits: ProcessCombination[] = []
  let totalCost = 0
  while (idx > 0) {
    const picked = pick[idx]
    if (!picked) break
    splits.unshift({
      amount: picked.amount,
      combinationString: picked.product.combination || picked.product.name,
      productId: picked.product.id,
    })
    totalCost += picked.cost
    idx -= Math.round(picked.amount * INT_SCALE)
  }

  const matched = splits.reduce((sum, s) => sum + s.amount, 0)
  const remainder = Math.max(0, target - matched)
  const failed: ProcessFailure[] = remainder > 1e-6 ? [{ amount: remainder, reason: 'no_denomination_match' }] : []

  return {
    combinationString: splits.map((s) => s.combinationString || String(s.amount)).join(' + '),
    totalCost,
    splits,
    failed,
    remainder,
    strategyUsed: 'min_cost',
  }
}

function fewestSplits(input: DenominationInput): DenominationResult {
  const numeric = toNumericProducts(input.products).filter((n) => n.product.isBaseAmount)
  const target = input.amount
  if (target <= 0) {
    return {
      combinationString: '',
      totalCost: 0,
      splits: [],
      failed: [],
      remainder: 0,
      strategyUsed: 'fewest_splits',
    }
  }

  const scaledTarget = Math.round(target)
  const dp = new Array<number>(scaledTarget + 1).fill(Infinity)
  const pick = new Array<NumericProduct | null>(scaledTarget + 1).fill(null)
  dp[0] = 0

  for (let i = 1; i <= scaledTarget; i += 1) {
    for (const n of numeric) {
      const aInt = Math.round(n.amount)
      if (aInt <= i && dp[i - aInt] + 1 < dp[i]!) {
        dp[i] = dp[i - aInt]! + 1
        pick[i] = n
      }
    }
  }

  let idx = scaledTarget
  while (idx > 0 && !Number.isFinite(dp[idx]!)) idx -= 1

  const splits: ProcessCombination[] = []
  let totalCost = 0
  while (idx > 0) {
    const picked = pick[idx]
    if (!picked) break
    splits.unshift({
      amount: picked.amount,
      combinationString: picked.product.combination || picked.product.name,
      productId: picked.product.id,
    })
    totalCost += picked.cost
    idx -= Math.round(picked.amount)
  }

  const matched = splits.reduce((sum, s) => sum + s.amount, 0)
  const remainder = Math.max(0, target - matched)
  const failed: ProcessFailure[] = remainder > 1e-6 ? [{ amount: remainder, reason: 'no_denomination_match' }] : []

  return {
    combinationString: splits.map((s) => s.combinationString || String(s.amount)).join(' + '),
    totalCost,
    splits,
    failed,
    remainder,
    strategyUsed: 'fewest_splits',
  }
}

export function runDenominationSplit(input: DenominationInput): DenominationResult {
  const override = manualOverride(input.amount, input.products, input.gameKey, input.supplierKey)
  if (override) return override

  const strategy = input.strategy ?? input.supplierGameMeta?.splitStrategy ?? 'greedy_largest_first'

  switch (strategy) {
    case 'fewest_splits':
      return fewestSplits(input)
    case 'min_cost':
      return minCost(input)
    case 'greedy_largest_first':
    default:
      return greedyLargestFirst(input)
  }
}
