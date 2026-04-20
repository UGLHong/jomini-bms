import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { supplierGameTable, supplierTable } from '@/server/db/schema'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const apiConfigSchema = z.object({
  kind: z.enum(['none', 'quinngamingshop']).default('none'),
  baseUrl: z.string().url().optional(),
  autoSubmit: z.boolean().optional(),
  defaultContact: z.string().optional(),
})

const supplierSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/i),
  name: z.string().min(1).max(200),
  enabled: z.boolean().default(true),
  relayChannel: z.enum(['telegram', 'none']).nullable().default('telegram'),
  telegramGroupId: z.string().nullable().optional(),
  telegramMentions: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  apiConfig: apiConfigSchema.default({ kind: 'none' }),
  apiKey: z.string().nullable().optional(),
  games: z
    .array(
      z.object({
        gameKey: z.string(),
        enabled: z.boolean().default(true),
        isDefault: z.boolean().default(false),
        metadata: z
          .object({
            splitStrategy: z
              .enum(['greedy_largest_first', 'fewest_splits', 'min_cost'])
              .optional(),
          })
          .default({}),
      }),
    )
    .default([]),
})

const bodySchema = z.object({
  upsert: z.array(supplierSchema).default([]),
  disableKeys: z.array(z.string()).default([]),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid suppliers payload')

  const db = useDb()
  const inserted: string[] = []

  await db.transaction(async (tx) => {
    for (const s of parsed.data.upsert) {
      // empty string clears the api key, null/undefined preserves existing value
      const apiKeyInsert = s.apiKey === '' ? null : s.apiKey ?? null
      const apiKeyUpdate = s.apiKey === undefined ? sql`${supplierTable.apiKey}` : s.apiKey === '' ? null : s.apiKey

      await tx
        .insert(supplierTable)
        .values({
          key: s.key,
          name: s.name,
          enabled: s.enabled,
          relayChannel: s.relayChannel ?? null,
          telegramGroupId: s.telegramGroupId ?? null,
          telegramMentions: s.telegramMentions,
          notes: s.notes ?? null,
          apiConfig: s.apiConfig,
          apiKey: apiKeyInsert,
        })
        .onConflictDoUpdate({
          target: supplierTable.key,
          set: {
            name: s.name,
            enabled: s.enabled,
            relayChannel: s.relayChannel ?? null,
            telegramGroupId: s.telegramGroupId ?? null,
            telegramMentions: s.telegramMentions,
            notes: s.notes ?? null,
            apiConfig: s.apiConfig,
            apiKey: apiKeyUpdate,
            updatedAt: sql`now()`,
          },
        })

      for (const g of s.games) {
        await tx
          .insert(supplierGameTable)
          .values({
            supplierKey: s.key,
            gameKey: g.gameKey,
            enabled: g.enabled,
            isDefault: g.isDefault,
            metadata: g.metadata,
          })
          .onConflictDoUpdate({
            target: [supplierGameTable.supplierKey, supplierGameTable.gameKey],
            set: {
              enabled: g.enabled,
              isDefault: g.isDefault,
              metadata: g.metadata,
            },
          })
      }

      inserted.push(s.key)
    }

    if (parsed.data.disableKeys.length > 0) {
      await tx
        .update(supplierTable)
        .set({ enabled: false, updatedAt: sql`now()` })
        .where(sql`${supplierTable.key} = ANY(${parsed.data.disableKeys})`)
    }
  })

  return { inserted, disabled: parsed.data.disableKeys }
})
