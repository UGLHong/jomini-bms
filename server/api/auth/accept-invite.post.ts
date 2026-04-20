import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { userTable } from '@/server/db/schema'
import { hashPassword } from '@/server/services/auth/password'
import { createSession } from '@/server/services/auth/session'
import { hashInviteToken } from '@/server/services/auth/tokens'
import { badRequest, unauthorized } from '@/server/utils/errors'

const bodySchema = z.object({
  token: z.string().min(8).max(128),
  password: z.string().min(10).max(256),
  displayName: z.string().min(1).max(120).optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid request')

  const db = useDb()
  const hashed = hashInviteToken(parsed.data.token)

  const [row] = await db
    .select()
    .from(userTable)
    .where(
      and(
        eq(userTable.inviteToken, hashed),
        eq(userTable.status, 'invited'),
        gt(userTable.inviteExpiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!row) throw unauthorized('Invite is invalid or has expired')

  const passwordHash = await hashPassword(parsed.data.password)

  const [updated] = await db
    .update(userTable)
    .set({
      passwordHash,
      status: 'active',
      inviteToken: null,
      inviteExpiresAt: null,
      displayName: parsed.data.displayName?.trim() || row.displayName || row.email.split('@')[0]!,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, row.id))
    .returning({
      id: userTable.id,
      email: userTable.email,
      role: userTable.role,
      displayName: userTable.displayName,
    })

  if (!updated) throw unauthorized('Invite could not be accepted')

  await createSession(event, updated)

  return { user: updated }
})
