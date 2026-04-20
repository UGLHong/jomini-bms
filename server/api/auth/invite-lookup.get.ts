import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { userTable } from '@/server/db/schema'
import { hashInviteToken } from '@/server/services/auth/tokens'
import { badRequest, notFound } from '@/server/utils/errors'

const querySchema = z.object({
  token: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw badRequest('Invalid request')

  const db = useDb()
  const hashed = hashInviteToken(parsed.data.token)

  const [row] = await db
    .select({
      email: userTable.email,
      displayName: userTable.displayName,
      role: userTable.role,
    })
    .from(userTable)
    .where(
      and(
        eq(userTable.inviteToken, hashed),
        eq(userTable.status, 'invited'),
        gt(userTable.inviteExpiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!row) throw notFound('Invite not found or expired')
  return { invite: row }
})
