import { and, eq, inArray, sql } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import {
  type OrderRow,
  type ProductRow,
  type ProcessCombination,
  type ProcessFailure,
  type SupplierApiConfig,
  type SupplierRow,
  type SupplierSubmissionAttempt,
  type SupplierSubmissionRow,
  type SupplierSubmissionStatus,
  orderTable,
  productTable,
  supplierSubmissionTable,
  supplierTable,
} from '@/server/db/schema'
import { logger } from '@/server/utils/logger'
import { markDone, markError } from '@/server/services/order/process'
import { resolveAdapter } from './index'

const SYSTEM_ACTOR = { id: 'system', name: 'supplier-api' }

function resolveServiceId(product: ProductRow | null, combination: ProcessCombination): string | null {
  if (product?.metadata?.supplierServiceId) return String(product.metadata.supplierServiceId)
  if (combination.combinationString) return combination.combinationString
  return null
}

function resolveTarget(order: OrderRow): string {
  return order.gameId
}

function resolveContact(order: OrderRow, supplier: SupplierRow): string {
  return order.phone || supplier.apiConfig?.defaultContact || '-'
}

function buildIdtrx(orderId: string, index: number): string {
  return `${orderId}-${index + 1}`
}

function appendAttempt(existing: SupplierSubmissionAttempt[], attempt: SupplierSubmissionAttempt): SupplierSubmissionAttempt[] {
  return [...existing, attempt].slice(-20)
}

type DispatchInput = {
  order: OrderRow
  callbackUrl?: string
}

export type DispatchResult = {
  submitted: number
  failed: number
  rows: SupplierSubmissionRow[]
}

export async function dispatchOrderToSupplierApi({ order, callbackUrl }: DispatchInput): Promise<DispatchResult | null> {
  const db = useDb()

  const [supplier] = await db.select().from(supplierTable).where(eq(supplierTable.key, order.supplierKey)).limit(1)
  if (!supplier) return null

  const config = (supplier.apiConfig ?? { kind: 'none' }) as SupplierApiConfig
  const apiKey = supplier.apiKey ?? ''
  const adapter = resolveAdapter(config.kind)
  if (!adapter || !apiKey || config.autoSubmit === false) return null

  const productIds = order.processPending
    .map((split) => split.productId)
    .filter((id): id is string => Boolean(id))

  const products: ProductRow[] = productIds.length > 0
    ? await db.select().from(productTable).where(inArray(productTable.id, productIds))
    : []
  const productMap = new Map(products.map((p) => [p.id, p] as const))

  const createdRows: SupplierSubmissionRow[] = []
  let submitted = 0
  let failed = 0

  for (let i = 0; i < order.processPending.length; i += 1) {
    const split = order.processPending[i]!
    const product = split.productId ? productMap.get(split.productId) ?? null : null
    const serviceId = resolveServiceId(product, split)
    const idtrx = buildIdtrx(order.id, i)

    if (!serviceId) {
      const attempt: SupplierSubmissionAttempt = {
        at: new Date().toISOString(),
        kind: 'submit',
        ok: false,
        message: 'missing_supplier_service_id',
      }
      const [row] = await db
        .insert(supplierSubmissionTable)
        .values({
          orderId: order.id,
          supplierKey: supplier.key,
          productId: product?.id ?? null,
          idtrx,
          serviceId: '',
          target: resolveTarget(order),
          contact: resolveContact(order, supplier),
          status: 'error',
          attempts: [attempt],
          request: { idtrx, amount: split.amount },
          lastResponse: { error: attempt.message },
        })
        .onConflictDoNothing({ target: [supplierSubmissionTable.supplierKey, supplierSubmissionTable.idtrx] })
        .returning()
      if (row) createdRows.push(row)
      failed += 1
      continue
    }

    const requestBody = {
      idtrx,
      service_id: serviceId,
      target: resolveTarget(order),
      contact: resolveContact(order, supplier),
      amount: split.amount,
    }

    const [row] = await db
      .insert(supplierSubmissionTable)
      .values({
        orderId: order.id,
        supplierKey: supplier.key,
        productId: product?.id ?? null,
        idtrx,
        serviceId,
        target: resolveTarget(order),
        contact: resolveContact(order, supplier),
        status: 'pending',
        attempts: [],
        request: requestBody,
        lastResponse: {},
      })
      .onConflictDoNothing({ target: [supplierSubmissionTable.supplierKey, supplierSubmissionTable.idtrx] })
      .returning()

    const record = row ?? (await db
      .select()
      .from(supplierSubmissionTable)
      .where(
        and(
          eq(supplierSubmissionTable.supplierKey, supplier.key),
          eq(supplierSubmissionTable.idtrx, idtrx),
        ),
      )
      .limit(1))[0]
    if (!record) continue

    const submitResult = await adapter.submit({
      config,
      apiKey,
      idtrx,
      serviceId,
      target: requestBody.target,
      contact: requestBody.contact,
      callbackUrl,
    })

    const attempt: SupplierSubmissionAttempt = {
      at: new Date().toISOString(),
      kind: 'submit',
      ok: submitResult.ok,
      message: submitResult.message,
    }

    const [updated] = await db
      .update(supplierSubmissionTable)
      .set({
        status: submitResult.status,
        externalInvoice: submitResult.externalInvoice ?? record.externalInvoice,
        attempts: appendAttempt(record.attempts ?? [], attempt),
        lastResponse: submitResult.raw,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supplierSubmissionTable.id, record.id))
      .returning()

    if (updated) createdRows.push(updated)
    if (submitResult.ok) submitted += 1
    else failed += 1
  }

  if (failed > 0 && submitted === 0) {
    await markError({
      orderId: order.id,
      actor: SYSTEM_ACTOR,
      failed: order.processPending.map(
        (split): ProcessFailure => ({
          amount: split.amount,
          reason: 'supplier_api_submit_failed',
          at: new Date().toISOString(),
        }),
      ),
    }).catch((err) => logger.warn({ err, orderId: order.id }, '[supplier-api] markError failed'))
  }

  return { submitted, failed, rows: createdRows }
}

export async function pollPendingSubmissions(limit = 50): Promise<{ checked: number; transitions: number }> {
  const db = useDb()

  const pending = await db
    .select()
    .from(supplierSubmissionTable)
    .where(inArray(supplierSubmissionTable.status, ['pending', 'processing']))
    .orderBy(supplierSubmissionTable.createdAt)
    .limit(limit)

  if (pending.length === 0) return { checked: 0, transitions: 0 }

  const supplierKeys = Array.from(new Set(pending.map((p) => p.supplierKey)))
  const suppliers = await db.select().from(supplierTable).where(inArray(supplierTable.key, supplierKeys))
  const supplierMap = new Map(suppliers.map((s) => [s.key, s] as const))

  let transitions = 0
  const orderIdsTouched = new Set<string>()

  for (const submission of pending) {
    const supplier = supplierMap.get(submission.supplierKey)
    if (!supplier) continue

    const config = (supplier.apiConfig ?? { kind: 'none' }) as SupplierApiConfig
    const adapter = resolveAdapter(config.kind)
    const apiKey = supplier.apiKey ?? ''
    if (!adapter || !apiKey || !submission.externalInvoice) continue

    const statusRes = await adapter.status({ config, apiKey, externalInvoice: submission.externalInvoice })
    const attempt: SupplierSubmissionAttempt = {
      at: new Date().toISOString(),
      kind: 'status',
      ok: statusRes.ok,
      message: statusRes.message,
    }

    const nextStatus: SupplierSubmissionStatus = statusRes.ok ? statusRes.status : submission.status

    if (nextStatus !== submission.status) transitions += 1

    await db
      .update(supplierSubmissionTable)
      .set({
        status: nextStatus,
        attempts: appendAttempt(submission.attempts ?? [], attempt),
        lastResponse: statusRes.raw,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supplierSubmissionTable.id, submission.id))

    if (nextStatus !== submission.status) orderIdsTouched.add(submission.orderId)
  }

  for (const orderId of orderIdsTouched) {
    await tryResolveOrderFromSubmissions(orderId)
  }

  return { checked: pending.length, transitions }
}

export async function tryResolveOrderFromSubmissions(orderId: string): Promise<void> {
  const db = useDb()
  const [order] = await db.select().from(orderTable).where(eq(orderTable.id, orderId)).limit(1)
  if (!order) return
  if (order.processStatus !== 'processing') return

  const subs = await db
    .select()
    .from(supplierSubmissionTable)
    .where(eq(supplierSubmissionTable.orderId, orderId))

  if (subs.length === 0) return

  const allTerminal = subs.every((s) => ['success', 'cancel', 'refund', 'error'].includes(s.status))
  if (!allTerminal) return

  const successful: ProcessCombination[] = []
  const failed: ProcessFailure[] = []

  for (const sub of subs) {
    const original = order.processPending.find((p) => p.productId === sub.productId && !successful.some((s) => s.productId === sub.productId))
      ?? order.processPending[subs.indexOf(sub)]
    const amount = original?.amount ?? 0

    if (sub.status === 'success') {
      successful.push({
        amount,
        combinationString: original?.combinationString,
        productId: sub.productId ?? original?.productId,
        resolvedAt: new Date().toISOString(),
      })
    } else {
      failed.push({
        amount,
        reason: `supplier_${sub.status}:${sub.externalInvoice ?? sub.idtrx}`,
        at: new Date().toISOString(),
      })
    }
  }

  if (failed.length === 0) {
    await markDone({
      orderId,
      actor: SYSTEM_ACTOR,
      successful,
    }).catch((err) => logger.warn({ err, orderId }, '[supplier-api] markDone failed'))
  } else if (successful.length === 0) {
    await markError({ orderId, actor: SYSTEM_ACTOR, failed }).catch((err) =>
      logger.warn({ err, orderId }, '[supplier-api] markError failed'),
    )
  } else {
    await db
      .update(orderTable)
      .set({
        processSuccessful: successful,
        processFailed: failed,
        remark: sql`coalesce(${orderTable.remark}, '') || ' supplier partial success'`,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId))
  }
}
