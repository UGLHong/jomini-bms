import { asc, eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { supplierGameTable, supplierTable } from '@/server/db/schema'
import { requireUser } from '@/server/utils/auth-guard'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const db = useDb()
  const suppliers = await db.select().from(supplierTable).orderBy(asc(supplierTable.name))

  const mappings = await db
    .select()
    .from(supplierGameTable)

  const withGames = suppliers.map((s) => {
    const { apiKey, ...rest } = s
    return {
      ...rest,
      apiConfig: s.apiConfig ?? { kind: 'none' },
      hasApiKey: Boolean(apiKey),
      games: mappings
        .filter((m) => m.supplierKey === s.key)
        .map((m) => ({
          gameKey: m.gameKey,
          enabled: m.enabled,
          isDefault: m.isDefault,
          metadata: m.metadata ?? {},
        })),
    }
  })

  return { suppliers: withGames }
})
