import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { userTable } from '@/server/db/schema'
import { readAccessTokenFromEvent, rotateRefreshToken } from '@/server/services/auth/session'

const UNPROTECTED_PREFIXES = [
  '/api/auth/',
  '/api/public/',
  '/order/create',
  '/stock_status',
  '/api/order/create',
  '/api/stock-status',
  '/api/telegram/webhook',
  '/api/health',
]

export default defineEventHandler(async (event) => {
  const url = event.path ?? event.node.req.url ?? '/'
  if (!url.startsWith('/api') && !url.startsWith('/order/') && !url.startsWith('/stock_status')) return

  if (UNPROTECTED_PREFIXES.some((p) => url === p || url.startsWith(p))) return

  let user = await readAccessTokenFromEvent(event)
  if (!user) {
    const rotated = await rotateRefreshToken(event)
    if (rotated) user = rotated.user
  }

  if (user && user.email === '') {
    const db = useDb()
    const [row] = await db
      .select({ email: userTable.email, role: userTable.role, displayName: userTable.displayName })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1)
    if (row) {
      user = { id: user.id, email: row.email, role: row.role, displayName: row.displayName }
    }
  }

  event.context.auth = { user: user ?? undefined }
})
