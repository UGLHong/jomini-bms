import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { configTable } from '@/server/db/schema'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest } from '@/server/utils/errors'

const bodySchema = z.object({
  title: z.string().max(200),
  bodyMarkdown: z.string().max(8000),
})

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid announcement')

  const db = useDb()
  const value = {
    title: parsed.data.title,
    bodyMarkdown: parsed.data.bodyMarkdown,
    updatedAt: new Date().toISOString(),
  }

  await db
    .insert(configTable)
    .values({ key: 'payment_announcement', value, updatedBy: admin.id })
    .onConflictDoUpdate({
      target: configTable.key,
      set: { value, updatedBy: admin.id, updatedAt: new Date() },
    })

  return { ok: true, config: value }
})
