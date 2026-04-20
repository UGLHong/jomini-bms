import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { userTable } from '@/server/db/schema'
import { generateInviteToken } from '@/server/services/auth/tokens'
import { requireAdmin } from '@/server/utils/auth-guard'
import { badRequest, conflict } from '@/server/utils/errors'

const bodySchema = z.object({
  email: z.string().email().max(254),
  displayName: z.string().min(1).max(120).default(''),
  role: z.enum(['admin', 'operator']).default('operator'),
  ttlHours: z.number().int().min(1).max(24 * 14).default(72),
})

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid invite payload')

  const db = useDb()
  const email = parsed.data.email.toLowerCase()

  const [existing] = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1)
  if (existing && existing.status === 'active') {
    throw conflict('User already exists')
  }

  const { plain, hash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + parsed.data.ttlHours * 3_600_000)

  if (existing) {
    await db
      .update(userTable)
      .set({
        displayName: parsed.data.displayName || existing.displayName,
        role: parsed.data.role,
        status: 'invited',
        inviteToken: hash,
        inviteExpiresAt: expiresAt,
        createdBy: admin.id,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, existing.id))
  } else {
    await db.insert(userTable).values({
      email,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      status: 'invited',
      inviteToken: hash,
      inviteExpiresAt: expiresAt,
      createdBy: admin.id,
    })
  }

  return {
    inviteToken: plain,
    expiresAt: expiresAt.toISOString(),
    email,
  }
})
