import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { productTable } from '@/server/db/schema'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const productSchema = z.object({
  id: z.string().uuid().optional(),
  gameKey: z.string().min(1),
  supplierKey: z.string().min(1),
  name: z.string().min(1).max(200),
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  combination: z.string().default(''),
  isBaseAmount: z.boolean().default(true),
  cost: z.union([z.string(), z.number()]).transform((v) => String(v)),
  selling: z.union([z.string(), z.number()]).transform((v) => String(v)),
  status: z.enum(['active', 'disabled']).default('active'),
  sortOrder: z.number().int().default(0),
  metadata: z
    .object({
      splitOverride: z.record(z.string(), z.string()).optional(),
      bonusOnly: z.boolean().optional(),
      promo: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .default({}),
})

const bodySchema = z.object({
  scope: z.object({
    gameKey: z.string().min(1),
    supplierKey: z.string().min(1),
  }),
  upsert: z.array(productSchema).default([]),
  deleteIds: z.array(z.string().uuid()).default([]),
  mode: z.enum(['merge', 'replace']).default('merge'),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid bulk payload')

  const { scope, upsert, deleteIds, mode } = parsed.data
  const db = useDb()

  let insertedCount = 0
  let updatedCount = 0
  let deletedCount = 0

  await db.transaction(async (tx) => {
    if (mode === 'replace') {
      const keepIds = upsert.map((p) => p.id).filter(Boolean) as string[]
      const deleteCond = and(
        eq(productTable.gameKey, scope.gameKey),
        eq(productTable.supplierKey, scope.supplierKey),
      )
      if (keepIds.length > 0) {
        const res = await tx
          .delete(productTable)
          .where(and(deleteCond, sql`${productTable.id} <> ALL(${keepIds})`))
        deletedCount += res.rowCount ?? 0
      } else {
        const res = await tx.delete(productTable).where(deleteCond)
        deletedCount += res.rowCount ?? 0
      }
    }

    if (deleteIds.length > 0) {
      const res = await tx.delete(productTable).where(inArray(productTable.id, deleteIds))
      deletedCount += res.rowCount ?? 0
    }

    for (const p of upsert) {
      if (p.gameKey !== scope.gameKey || p.supplierKey !== scope.supplierKey) {
        throw badRequest(`Product ${p.name} has mismatched game/supplier`)
      }

      if (p.id) {
        const [updated] = await tx
          .update(productTable)
          .set({
            name: p.name,
            amount: p.amount,
            combination: p.combination,
            isBaseAmount: p.isBaseAmount,
            cost: p.cost,
            selling: p.selling,
            status: p.status,
            sortOrder: p.sortOrder,
            metadata: p.metadata,
            updatedAt: new Date(),
          })
          .where(eq(productTable.id, p.id))
          .returning({ id: productTable.id })
        if (updated) updatedCount += 1
      } else {
        await tx
          .insert(productTable)
          .values({
            gameKey: p.gameKey,
            supplierKey: p.supplierKey,
            name: p.name,
            amount: p.amount,
            combination: p.combination,
            isBaseAmount: p.isBaseAmount,
            cost: p.cost,
            selling: p.selling,
            status: p.status,
            sortOrder: p.sortOrder,
            metadata: p.metadata,
          })
          .onConflictDoUpdate({
            target: [
              productTable.gameKey,
              productTable.supplierKey,
              productTable.name,
              productTable.amount,
            ],
            set: {
              combination: p.combination,
              isBaseAmount: p.isBaseAmount,
              cost: p.cost,
              selling: p.selling,
              status: p.status,
              sortOrder: p.sortOrder,
              metadata: p.metadata,
              updatedAt: new Date(),
            },
          })
        insertedCount += 1
      }
    }
  })

  return { insertedCount, updatedCount, deletedCount }
})
