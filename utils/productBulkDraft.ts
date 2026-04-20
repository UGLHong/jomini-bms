export type ProductDraft = {
  id?: string
  gameKey: string
  supplierKey: string
  name: string
  amount: string | number
  combination?: string
  isBaseAmount?: boolean
  cost: string | number
  selling: string | number
  status?: 'active' | 'disabled'
  sortOrder?: number
  metadata?: Record<string, unknown>
}

export type ProductBulkDraft = {
  scope: { gameKey: string; supplierKey: string }
  mode: 'merge' | 'replace'
  products: ProductDraft[]
  deleteIds?: string[]
}

export function makeDraftFromProducts(
  gameKey: string,
  supplierKey: string,
  products: ProductDraft[],
): ProductBulkDraft {
  return {
    scope: { gameKey, supplierKey },
    mode: 'merge',
    products: products.map((p) => ({
      id: p.id,
      gameKey: p.gameKey,
      supplierKey: p.supplierKey,
      name: p.name,
      amount: p.amount,
      combination: p.combination ?? '',
      isBaseAmount: p.isBaseAmount ?? true,
      cost: p.cost,
      selling: p.selling,
      status: p.status ?? 'active',
      sortOrder: p.sortOrder ?? 0,
      metadata: p.metadata ?? {},
    })),
  }
}

export function stringifyDraft(draft: ProductBulkDraft): string {
  return JSON.stringify(draft, null, 2)
}

export function parseTsvPaste(text: string): ProductDraft[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const header = lines[0]!.split(/\t|,/).map((h) => h.trim().toLowerCase())
  const rows: ProductDraft[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i]!.split(/\t|,/).map((c) => c.trim())
    const rowMap = new Map<string, string>()
    header.forEach((h, j) => rowMap.set(h, cells[j] ?? ''))

    const name = rowMap.get('name') ?? ''
    const amount = rowMap.get('amount') ?? rowMap.get('denom') ?? ''
    const cost = rowMap.get('cost') ?? ''
    const selling = rowMap.get('selling') ?? rowMap.get('price') ?? ''
    if (!name || !amount) continue

    rows.push({
      gameKey: rowMap.get('gamekey') ?? '',
      supplierKey: rowMap.get('supplierkey') ?? '',
      name,
      amount,
      cost: cost || '0',
      selling: selling || '0',
      combination: rowMap.get('combination') ?? '',
      sortOrder: Number.parseInt(rowMap.get('sortorder') ?? '0', 10) || 0,
    })
  }

  return rows
}
