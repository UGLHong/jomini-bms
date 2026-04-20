import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { type SupplierApiConfig, supplierTable } from '@/server/db/schema'
import { resolveAdapter } from '@/server/services/supplier-api'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const key = getRouterParam(event, 'key')
  if (!key) throw notFound('Supplier not found')

  const db = useDb()
  const [supplier] = await db.select().from(supplierTable).where(eq(supplierTable.key, key)).limit(1)
  if (!supplier) throw notFound('Supplier not found')

  const config = (supplier.apiConfig ?? { kind: 'none' }) as SupplierApiConfig
  const adapter = resolveAdapter(config.kind)
  if (!adapter) throw badRequest('Supplier has no API integration configured')
  if (!supplier.apiKey) throw badRequest('Supplier has no API key configured')

  return adapter.balance(config, supplier.apiKey)
})
