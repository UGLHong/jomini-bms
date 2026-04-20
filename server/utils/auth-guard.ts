import type { H3Event } from 'h3'
import { forbidden, unauthorized } from '@/server/utils/errors'
import type { AuthedUser } from '@/server/services/auth/session'

export function requireUser(event: H3Event): AuthedUser {
  const user = event.context.auth?.user
  if (!user) throw unauthorized('Not signed in')
  return user
}

export function requireAdmin(event: H3Event): AuthedUser {
  const user = requireUser(event)
  if (user.role !== 'admin') throw forbidden('Admin role required')
  return user
}

declare module 'h3' {
  interface H3EventContext {
    auth?: {
      user?: AuthedUser
    }
  }
}
