import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { gameTable, stockTable } from '@/server/db/schema'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const gameSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/i),
  name: z.string().min(1).max(200),
  enabled: z.boolean().default(true),
  iconUrl: z.string().url().nullable().optional(),
  currencyLabel: z.string().min(1).max(64).default('Diamonds'),
  sortOrder: z.number().int().default(0),
  gameIdFormat: z
    .object({
      regex: z.string().optional(),
      example: z.string().optional(),
      placeholder: z.string().optional(),
      currencyIcon: z.string().optional(),
      splitPattern: z.string().optional(),
    })
    .default({}),
})

const bodySchema = z.object({
  upsert: z.array(gameSchema).default([]),
  disableKeys: z.array(z.string()).default([]),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid games payload')

  const db = useDb()
  const inserted: string[] = []

  await db.transaction(async (tx) => {
    for (const g of parsed.data.upsert) {
      await tx
        .insert(gameTable)
        .values({
          key: g.key,
          name: g.name,
          enabled: g.enabled,
          iconUrl: g.iconUrl ?? null,
          currencyLabel: g.currencyLabel,
          sortOrder: g.sortOrder,
          gameIdFormat: g.gameIdFormat,
        })
        .onConflictDoUpdate({
          target: gameTable.key,
          set: {
            name: g.name,
            enabled: g.enabled,
            iconUrl: g.iconUrl ?? null,
            currencyLabel: g.currencyLabel,
            sortOrder: g.sortOrder,
            gameIdFormat: g.gameIdFormat,
            updatedAt: sql`now()`,
          },
        })

      await tx
        .insert(stockTable)
        .values({ gameKey: g.key })
        .onConflictDoNothing()

      inserted.push(g.key)
    }

    if (parsed.data.disableKeys.length > 0) {
      await tx
        .update(gameTable)
        .set({ enabled: false, updatedAt: sql`now()` })
        .where(sql`${gameTable.key} = ANY(${parsed.data.disableKeys})`)
    }
  })

  return { inserted, disabled: parsed.data.disableKeys }
})
