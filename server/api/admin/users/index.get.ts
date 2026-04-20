import { desc } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { userTable } from '@/server/db/schema'
import { requireAdmin } from '@/server/utils/auth-guard'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const rows = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      displayName: userTable.displayName,
      role: userTable.role,
      status: userTable.status,
      lastLoginAt: userTable.lastLoginAt,
      createdAt: userTable.createdAt,
      inviteExpiresAt: userTable.inviteExpiresAt,
    })
    .from(userTable)
    .orderBy(desc(userTable.createdAt))

  return { users: rows }
})
