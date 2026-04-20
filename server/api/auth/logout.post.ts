import { revokeSession } from '@/server/services/auth/session'

export default defineEventHandler(async (event) => {
  await revokeSession(event)
  return { ok: true }
})
