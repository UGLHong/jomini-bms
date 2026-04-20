import { rotateRefreshToken } from '@/server/services/auth/session'
import { unauthorized } from '@/server/utils/errors'

export default defineEventHandler(async (event) => {
  const result = await rotateRefreshToken(event)
  if (!result) throw unauthorized('Refresh token invalid or expired')
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      displayName: result.user.displayName,
    },
  }
})
