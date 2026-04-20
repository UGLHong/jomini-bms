import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { userTable } from '@/server/db/schema'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest, notFound } from '@/server/utils/errors'

const bodySchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  role: z.enum(['admin', 'operator']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw badRequest('Missing user id')

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid update')

  const db = useDb()
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.displayName !== undefined) update.displayName = parsed.data.displayName
  if (parsed.data.role !== undefined) update.role = parsed.data.role
  if (parsed.data.status !== undefined) update.status = parsed.data.status

  const [row] = await db
    .update(userTable)
    .set(update)
    .where(eq(userTable.id, id))
    .returning({
      id: userTable.id,
      email: userTable.email,
      role: userTable.role,
      status: userTable.status,
      displayName: userTable.displayName,
    })

  if (!row) throw notFound('User not found')
  return { user: row }
})
