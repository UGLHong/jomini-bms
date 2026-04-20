import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '@/server/db/client'
import { userTable } from '@/server/db/schema'
import { verifyPassword } from '@/server/services/auth/password'
import { createSession } from '@/server/services/auth/session'
import { badRequest, unauthorized } from '@/server/utils/errors'
import { clientKey, hitRateLimit } from '@/server/utils/rateLimit'
import { logger } from '@/server/utils/logger'

const bodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
})

export default defineEventHandler(async (event) => {
  const limited = hitRateLimit({ key: `login:${clientKey(event)}`, windowMs: 60_000, max: 10 })
  if (!limited.allowed) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', Math.ceil(limited.retryAfterMs / 1000))
    return { error: 'Too many attempts, try again later' }
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw badRequest('Invalid credentials')

  const db = useDb()
  const email = parsed.data.email.toLowerCase()

  const [row] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)

  if (!row || row.status !== 'active' || !row.passwordHash) {
    throw unauthorized('Invalid email or password')
  }

  const ok = await verifyPassword(row.passwordHash, parsed.data.password)
  if (!ok) {
    logger.warn({ email }, 'login failure')
    throw unauthorized('Invalid email or password')
  }

  await db
    .update(userTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(userTable.id, row.id))

  await createSession(event, {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.displayName,
  })

  return {
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      displayName: row.displayName,
    },
  }
})
