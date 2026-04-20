import { and, count, eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import {
  type OrderInsert,
  type OrderRow,
  type ProductRow,
  type SupplierGameMetadata,
  gameTable,
  orderTable,
  productTable,
  supplierGameTable,
  supplierTable,
} from '@/server/db/schema'
import { newOrderId } from '@/server/utils/ids'
import { parseAmount } from '@/server/utils/parseAmount'
import { notifyOrderCreated } from '@/server/services/notify/dispatch'
import { logger } from '@/server/utils/logger'
import { runDenominationSplit } from './denomination-split'
import { resolveGameId } from './resolveGameId'
import { acquireOrderLock } from './locks'

type Source = 'flowxo_bot' | 'manychat_bot' | 'jg_internal_web' | 'public_form'
type Channel = 'web' | 'messenger' | 'telegram' | 'whatsapp'

export type CreateOrderInput = {
  fullname: string
  userId: string
  responsePath?: string
  gender?: string
  phone?: string
  email?: string
  gameKey: string
  gameId: string
  buyAmount: string | number
  paidAmount: string | number
  receiptUrl?: string
  source: Source
  channel: Channel
  language?: string
  supplierKey?: string
  remark?: string
}

export type CreateOrderResult = {
  order: OrderRow
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const db = useDb()

  const [game] = await db.select().from(gameTable).where(eq(gameTable.key, input.gameKey)).limit(1)
  if (!game) throw new Error(`Unknown game: ${input.gameKey}`)

  let supplierKey = input.supplierKey
  if (!supplierKey) {
    const [defaultSupplier] = await db
      .select({ supplierKey: supplierGameTable.supplierKey })
      .from(supplierGameTable)
      .where(
        and(
          eq(supplierGameTable.gameKey, input.gameKey),
          eq(supplierGameTable.isDefault, true),
          eq(supplierGameTable.enabled, true),
        ),
      )
      .limit(1)
    if (!defaultSupplier) throw new Error(`No default supplier configured for ${input.gameKey}`)
    supplierKey = defaultSupplier.supplierKey
  }

  const [supplier] = await db.select().from(supplierTable).where(eq(supplierTable.key, supplierKey)).limit(1)
  if (!supplier) throw new Error(`Unknown supplier: ${supplierKey}`)

  const [sg] = await db
    .select({ metadata: supplierGameTable.metadata })
    .from(supplierGameTable)
    .where(
      and(
        eq(supplierGameTable.supplierKey, supplierKey),
        eq(supplierGameTable.gameKey, input.gameKey),
      ),
    )
    .limit(1)

  const products: ProductRow[] = await db
    .select()
    .from(productTable)
    .where(and(eq(productTable.gameKey, input.gameKey), eq(productTable.supplierKey, supplierKey)))

  const buyAmount = parseAmount(input.buyAmount)
  const paidAmount = parseAmount(input.paidAmount)

  const resolved = resolveGameId(input.gameId, game.gameIdFormat as Record<string, unknown>)

  const split = runDenominationSplit({
    amount: buyAmount,
    gameKey: input.gameKey,
    supplierKey,
    products,
    supplierGameMeta: sg?.metadata as SupplierGameMetadata | null,
  })

  const profit = paidAmount - split.totalCost

  const [prevOrderCountRow, prevOrderIdCountRow] = await Promise.all([
    db
      .select({ c: count() })
      .from(orderTable)
      .where(eq(orderTable.fullname, input.fullname)),
    db
      .select({ c: count() })
      .from(orderTable)
      .where(eq(orderTable.gameId, resolved.canonical || input.gameId)),
  ])

  const id = newOrderId()

  return acquireOrderLock({ game: input.gameKey, gameId: resolved.canonical || input.gameId }, async () => {
    const value: OrderInsert = {
      id,
      userId: input.userId,
      ign: resolved.ign,
      fullname: input.fullname,
      gender: input.gender ?? '',
      phone: input.phone ?? '',
      email: input.email ?? '',
      gameKey: input.gameKey,
      gameId: resolved.canonical || input.gameId,
      buyAmount: String(buyAmount),
      paidAmount: String(paidAmount),
      costPrice: String(split.totalCost),
      profit: String(profit),
      receiptUrl: input.receiptUrl ?? '',
      processSuccessful: [],
      processPending: split.splits,
      processFailed: split.failed,
      processStatus: 'open',
      supplierKey,
      processMethod: '',
      remark: input.remark ?? '',
      source: input.source,
      amountCombinationString: split.combinationString,
      responsePath: input.responsePath ?? '',
      channel: input.channel,
      language: input.language ?? 'Bahasa Melayu',
      prevOrderCount: prevOrderCountRow[0]?.c ?? 0,
      prevOrderIdCount: prevOrderIdCountRow[0]?.c ?? 0,
    }

    const [row] = await db.insert(orderTable).values(value).returning()
    if (!row) throw new Error('Order insert failed')

    notifyOrderCreated(row).catch((err) => logger.warn({ err, orderId: row.id }, '[order] notify failed'))

    return { order: row }
  })
}
